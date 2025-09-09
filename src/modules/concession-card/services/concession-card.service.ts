import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { EDocumentType } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import {
  ConcessionCardManualDecisionDto,
  GetConcessionCardDto,
  SetConcessionCardDto,
  UpdateConcessionCardDto,
} from "src/modules/concession-card/common/dto";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";
import { EmailsService } from "src/modules/emails/services";
import { NotificationService } from "src/modules/notifications/services";
import { GetConcessionCardOutput, SetConcessionCardOutput } from "src/modules/concession-card/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "src/modules/users/entities";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class ConcessionCardService {
  private readonly lokiLogger = new LokiLogger(ConcessionCardService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(UserConcessionCard)
    private readonly userConcessionCardRepository: Repository<UserConcessionCard>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async createConcessionCard(dto: SetConcessionCardDto, user: ITokenUserData): Promise<SetConcessionCardOutput> {
    if (
      (!dto.centerlinkPensionerConcessionCardNumber && !dto.veteranAffairsPensionerConcessionCardNumber) ||
      (dto.centerlinkPensionerConcessionCardNumber && dto.veteranAffairsPensionerConcessionCardNumber)
    ) {
      throw new BadRequestException("Set one of concession card type!");
    }

    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      where: whereCondition,
      relations: {
        languageDocChecks: true,
        ieltsCheck: true,
        userConcessionCard: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException("User role not found.");
    }

    if (
      userRole.userConcessionCard &&
      userRole.userConcessionCard.status !== EUserConcessionCardStatus.DOCUMENT_VERIFICATION_FAILS
    ) {
      throw new BadRequestException("Concession card already created for this user!");
    }

    const existConcessionCard = await this.userConcessionCardRepository.findOne({
      where: [
        { centerlinkPensionerConcessionCardNumber: dto.centerlinkPensionerConcessionCardNumber },
        { veteranAffairsPensionerConcessionCardNumber: dto.veteranAffairsPensionerConcessionCardNumber },
      ],
      relations: { userRole: true },
    });

    if (existConcessionCard && existConcessionCard.userRole.userId !== userRole.userId) {
      throw new BadRequestException("Concession card already exist!");
    }

    let concessionCard: UserConcessionCard;

    if (userRole.userConcessionCard) {
      concessionCard = userRole.userConcessionCard;
      Object.assign(concessionCard, dto);
      concessionCard.status = EUserConcessionCardStatus.INITIALIZED;
    }

    if (!userRole.userConcessionCard) {
      concessionCard = this.userConcessionCardRepository.create({ ...dto, userRole });
    }

    const newConcessionCard = await this.userConcessionCardRepository.save(concessionCard!);

    return { id: newConcessionCard.id };
  }

  public async uploadFileToConcessionCard(
    id: string,
    user: ITokenUserData,
    file: IFile,
  ): Promise<SetConcessionCardOutput> {
    if (!file) {
      throw new BadRequestException("File not received!");
    }

    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id },
      relations: {
        document: true,
        userRole: {
          ieltsCheck: true,
          user: true,
        },
      },
    });

    if (!concessionCard) {
      throw new BadRequestException("Concession card not exist for this user!");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, concessionCard.userRole);

    if (concessionCard.status === EUserConcessionCardStatus.VERIFIED) {
      throw new BadRequestException("File cannot be uploaded for this request!");
    }

    let document: UserDocument;

    if (concessionCard.document) {
      await this.awsS3Service.deleteObject(concessionCard.document.s3Key);

      document = concessionCard.document;
      document.s3Key = file.key;
    }

    if (!concessionCard.document) {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.CONCESSION_CARD,
        s3Key: file.key,
        userRole: concessionCard.userRole,
        userConcessionCard: concessionCard,
      });
    }

    await this.userDocumentRepository.save(document!);

    await this.userConcessionCardRepository.update(
      { id: concessionCard.id },
      { status: EUserConcessionCardStatus.PENDING },
    );

    void this.sendEmailsToAdminsInBackground(concessionCard.userRole).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send concession card check verification emails to admins:`, error.stack);
    });

    return { id: concessionCard.id };
  }

  public async updateConcessionCard(dto: UpdateConcessionCardDto, file?: IFile): Promise<IMessageOutput> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id: dto.id },
      relations: { userRole: { user: true }, document: true },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found.");
    }

    if (
      (!dto.centerlinkPensionerConcessionCardNumber && !dto.veteranAffairsPensionerConcessionCardNumber) ||
      (dto.centerlinkPensionerConcessionCardNumber && dto.veteranAffairsPensionerConcessionCardNumber)
    ) {
      throw new BadRequestException("Set one of concession card type!");
    }

    if (
      concessionCard.status === EUserConcessionCardStatus.PENDING ||
      concessionCard.status === EUserConcessionCardStatus.INITIALIZED
    ) {
      throw new BadRequestException("Concession card with this id is pending!");
    }

    if (file) {
      if (concessionCard.document) {
        await this.awsS3Service.deleteObject(concessionCard.document.s3Key);

        await this.userDocumentRepository.update({ id: concessionCard.document.id }, { s3Key: file.key });
      }
    }

    await this.userConcessionCardRepository.update(concessionCard.id, {
      centerlinkPensionerConcessionCardNumber: dto.centerlinkPensionerConcessionCardNumber,
      veteranAffairsPensionerConcessionCardNumber: dto.veteranAffairsPensionerConcessionCardNumber,
      status: EUserConcessionCardStatus.PENDING,
    });

    void this.sendEmailsToAdminsInBackground(concessionCard.userRole).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send concession card check verification emails to admins:`, error.stack);
    });

    return { message: "Concession card updated successfully." };
  }

  public async getConcessionCard(
    dto: GetConcessionCardDto,
    user: ITokenUserData,
  ): Promise<GetConcessionCardOutput | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserConcessionCard> = isAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    const concessionCard: GetConcessionCardOutput | null = await this.userConcessionCardRepository.findOne({
      where: whereCondition,
      relations: { document: true, userRole: true },
    });

    if (concessionCard) {
      await this.accessControlService.authorizeUserRoleForOperation(user, concessionCard.userRole);

      if (concessionCard.document?.s3Key) {
        concessionCard.downloadLink = await this.awsS3Service.getShortLivedSignedUrl(concessionCard.document.s3Key);
      }
    }

    return concessionCard;
  }

  public async concessionCardManualDecision(dto: ConcessionCardManualDecisionDto, user: ITokenUserData): Promise<void> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found!");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, concessionCard.userRole);

    if (concessionCard.status === EUserConcessionCardStatus.INITIALIZED) {
      throw new BadRequestException("Concession card does not have uploaded file!");
    }

    await this.userConcessionCardRepository.update({ id: dto.id }, { status: dto.status });

    if (dto.status === EUserConcessionCardStatus.VERIFIED) {
      this.activationTrackingService.checkActivationStepsEnded(concessionCard.userRole).catch((error: Error) => {
        this.lokiLogger.error(
          `checkActivationStepsEnded error, userRoleId: ${concessionCard.userRole.id}`,
          error.stack,
        );
      });
    }

    await this.notifyUserAboutConcessionCardVerification(concessionCard.userRole, dto.status);

    return;
  }

  public async removeConcessionCard(id: string): Promise<void> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found!");
    }

    if (
      concessionCard.status === EUserConcessionCardStatus.PENDING ||
      concessionCard.status === EUserConcessionCardStatus.INITIALIZED
    ) {
      throw new BadRequestException("Concession card with this id is pending!");
    }

    await this.userConcessionCardRepository.delete({ id });

    if (concessionCard.document) {
      await this.awsS3Service.deleteObject(concessionCard.document.s3Key);
    }

    return;
  }

  public async removeConcessionCardFile(id: string, user: ITokenUserData): Promise<void> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id },
      relations: { document: true, userRole: { role: true, user: true } },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found.");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, concessionCard.userRole);

    if (!concessionCard.document) {
      throw new BadRequestException("Concession card does not have uploaded file.");
    }

    await this.awsS3Service.deleteObject(concessionCard.document.s3Key);
    await this.userDocumentRepository.remove(concessionCard.document);

    return;
  }

  private async notifyUserAboutConcessionCardVerification(
    userRole: UserRole,
    status: EUserConcessionCardStatus,
  ): Promise<void> {
    const VERIFICATION = "Concession Card";

    if (status === EUserConcessionCardStatus.VERIFIED) {
      this.emailsService.sendDocumentVerificationAccepted(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send concession card check verification email for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
      this.notificationService.sendConcessionCardCheckVerificationNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send concession card check verification notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    } else {
      this.emailsService.sendDocumentVerificationRejected(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send concession card check verification email for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
      this.notificationService.sendConcessionCardCheckErrorNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send concession card check verification notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    }
  }

  private async sendEmailsToAdminsInBackground(userRole: UserRole): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();
    const documentsAndPaymentLink = `${this.FRONT_END_URL}/members/details/${userRole.id}/documents_and_payment`;

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendConcessionCardNotifyToAdmin(
        superAdmin.email,
        userRole.user.platformId || "",
        documentsAndPaymentLink,
      );
    }
  }
}
