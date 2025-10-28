import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { InjectRepository } from "@nestjs/typeorm";
import { UserDocument } from "src/modules/users/entities";
import { FindOptionsWhere, In, IsNull, Repository } from "typeorm";
import { EDocumentType } from "src/modules/users/common/enums";
import { IBackyCheckOrder, IStartWWCCReq, IUploadDocsInterface } from "src/modules/backy-check/common/interfaces";
import { StartWWCCDto, StatusManualDecisionDto, UpdateWWCCDto } from "src/modules/backy-check/common/dto";
import {
  EBackyCheckErrorCodes,
  EExtBackyCheckResultResponse,
  EExtCheckResult,
  EExtCheckStatus,
  EExtIssueState,
  EManualCheckResult,
} from "src/modules/backy-check/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";
import { BackyCheckSdkService } from "src/modules/backy-check/services";
import { EmailsService } from "src/modules/emails/services";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { UserRole } from "src/modules/users/entities";
import { ConfigService } from "@nestjs/config";
import { MockService } from "src/modules/mock/services";
import { GetWwccOutput, IDownloadDocsOutput, IStartWwccResOutput } from "src/modules/backy-check/common/outputs";
import {
  MOCK_ENABLED,
  NUMBER_OF_DAYS_IN_WEEK,
  NUMBER_OF_HOURS_IN_DAY,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants/constants";
import { NotificationService } from "src/modules/notifications/services";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import { EMockType } from "src/modules/mock/common/enums";
import { findOneOrFailTyped } from "src/common/utils";
import { ECommonErrorCodes } from "src/common/enums";

@Injectable()
export class BackyCheckService {
  private readonly lokiLogger = new LokiLogger(BackyCheckService.name);
  private readonly FRONT_END_URL: string;

  public constructor(
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    @InjectRepository(BackyCheck)
    private readonly backyCheckRepository: Repository<BackyCheck>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly awsS3Service: AwsS3Service,
    private readonly backyCheckSdkService: BackyCheckSdkService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly notificationService: NotificationService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async uploadDocs(dto: UUIDParamDto, user: ITokenUserData, file: IFile): Promise<IUploadDocsInterface> {
    if (!file) {
      throw new BadRequestException(ECommonErrorCodes.FILE_NOT_RECEIVED);
    }

    const backyCheck = await findOneOrFailTyped<BackyCheck>(dto.id, this.backyCheckRepository, {
      where: { id: dto.id },
      relations: {
        document: true,
        userRole: { user: true },
      },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, backyCheck.userRole);

    if (backyCheck.manualCheckResults === EManualCheckResult.MANUAL_APPROVED) {
      throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_FILE_UPLOAD_NOT_ALLOWED);
    }

    let document: UserDocument | null = null;

    if (backyCheck.document) {
      await this.awsS3Service.deleteObject(backyCheck.document.s3Key);

      document = backyCheck.document;
      document.s3Key = file.key;
    }

    if (!backyCheck.document) {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.BACKYCHECK,
        s3Key: file.key,
        userRole: backyCheck.userRole,
        backyCheck,
      });
    }

    const newDocument = await this.userDocumentRepository.save(document!);

    await this.backyCheckRepository.update({ id: backyCheck.id }, { manualCheckResults: EManualCheckResult.PENDING });

    void this.sendEmailsToAdminsInBackground(backyCheck).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send backy check emails to admins:`, error.stack);
    });

    return { id: newDocument.id };
  }

  public async downloadDocs(dto: UUIDParamDto, user: ITokenUserData): Promise<IDownloadDocsOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserDocument> = isAdminOperation
      ? { id: dto.id }
      : { id: dto.id, userRole: { id: user.userRoleId } };

    const document = await findOneOrFailTyped<UserDocument>(dto.id, this.userDocumentRepository, {
      where: whereCondition,
      relations: { userRole: true },
    });

    if (!document.s3Key) {
      throw new UnprocessableEntityException(EBackyCheckErrorCodes.SERVICE_DOCUMENT_NOT_UPLOADED);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, document.userRole);

    const fileLink = await this.awsS3Service.getShortLivedSignedUrl(document.s3Key);

    return { link: fileLink };
  }

  public async startWWCC(dto: StartWWCCDto, user: ITokenUserData): Promise<IStartWwccResOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: whereCondition,
      relations: { profile: true, backyCheck: { userRole: { role: true, user: true } } },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    let backyCheckRequest: BackyCheck;

    if (userRole.backyCheck) {
      backyCheckRequest = userRole.backyCheck;

      if (
        backyCheckRequest.checkStatus === EExtCheckStatus.READY ||
        backyCheckRequest.checkResults === EExtCheckResult.CLEAR ||
        backyCheckRequest.manualCheckResults === EManualCheckResult.MANUAL_APPROVED
      ) {
        throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_WWCC_ALREADY_ENDED);
      }

      if (
        backyCheckRequest.checkStatus !== EExtCheckStatus.IN_PROGRESS &&
        backyCheckRequest.checkStatus !== EExtCheckStatus.VERIFIED &&
        backyCheckRequest.manualCheckResults !== EManualCheckResult.MANUAL_REJECTED
      ) {
        throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_UPDATE_NOT_POSSIBLE);
      }

      await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

      const creationDate = new Date(backyCheckRequest.creationDate);
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - creationDate.getTime();
      const timeDifferent =
        NUMBER_OF_DAYS_IN_WEEK *
        NUMBER_OF_HOURS_IN_DAY *
        NUMBER_OF_MINUTES_IN_HOUR *
        NUMBER_OF_SECONDS_IN_MINUTE *
        NUMBER_OF_MILLISECONDS_IN_SECOND;

      if (elapsedTime >= timeDifferent) {
        throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_ORDER_EXPIRED);
      }

      await this.backyCheckRepository.update(
        { id: backyCheckRequest.id },
        {
          WWCCNumber: dto.WWCCNumber,
          checkStatus: null,
          checkResults: null,
          checkResultsNotes: null,
          orderId: null,
          orderOfficerNotes: null,
          manualCheckResults: null,
        },
      );
    } else {
      const newBackyCheckRequest = this.backyCheckRepository.create({
        WWCCNumber: dto.WWCCNumber,
        expiredDate: new Date(dto.expiredDate),
        issueState: dto.issueState,
        userRole: userRole,
      });
      backyCheckRequest = await this.backyCheckRepository.save(newBackyCheckRequest);
    }

    if (MOCK_ENABLED) {
      if (dto.WWCCNumber === this.mockService.mockWWCCNumber) {
        const mock = await this.mockService.processMock({
          type: EMockType.START_WWCC,
          data: { requestId: backyCheckRequest.id },
        });
        this.activationTrackingService.checkActivationStepsEnded(backyCheckRequest.userRole).catch((error: Error) => {
          this.lokiLogger.error(
            `checkActivationStepsEnded error, userRoleId: ${backyCheckRequest.userRole.id}`,
            error.stack,
          );
        });

        return mock.result;
      }
    }

    if (dto.issueState === EExtIssueState.AUSTRALIA_CAPITAL_TERRITORY) {
      await this.backyCheckRepository.update(
        { id: backyCheckRequest.id },
        { manualCheckResults: EManualCheckResult.INITIAL },
      );

      return { id: backyCheckRequest.id };
    }

    const requestData: IStartWWCCReq = {
      firstName: userRole.profile.firstName,
      middleName: userRole.profile.middleName || "",
      surname: userRole.profile.lastName,
      email: userRole.profile.contactEmail,
      DOB: userRole.profile.dateOfBirth,
      cardNumber: dto.WWCCNumber,
      cardExpiryDate: dto.expiredDate,
      cardStateIssue: dto.issueState,
      dependantClientID: "",
      costCentreId: "",
    };

    const startWWCCRes = await this.backyCheckSdkService.startWWCC(requestData);

    if (startWWCCRes.result.response === EExtBackyCheckResultResponse.ERROR || !startWWCCRes?.orderDetails) {
      this.notificationService.sendBackyCheckErrorNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send backy check error notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });

      await this.backyCheckRepository.update(
        { id: backyCheckRequest.id },
        {
          checkResultsNotes: startWWCCRes.result.responseDetails,
        },
      );

      throw new ServiceUnavailableException(startWWCCRes.result.responseDetails);
    }

    await this.backyCheckRepository.update(
      { id: backyCheckRequest.id },
      { orderId: startWWCCRes.orderDetails.orderID },
    );

    return { id: backyCheckRequest.id };
  }

  public async updateWWCC(dto: UpdateWWCCDto, user: ITokenUserData, file?: IFile): Promise<IMessageOutput> {
    const backyCheck = await findOneOrFailTyped<BackyCheck>(dto.id, this.backyCheckRepository, {
      where: { id: dto.id },
      relations: {
        userRole: { role: true, user: true },
        document: true,
      },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, backyCheck.userRole);

    if (
      backyCheck.checkStatus === EExtCheckStatus.OPEN ||
      backyCheck.checkStatus === EExtCheckStatus.IN_PROGRESS ||
      backyCheck.checkStatus === EExtCheckStatus.VERIFIED ||
      backyCheck.checkStatus === EExtCheckStatus.IN_REVIEW
    ) {
      throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_UPDATE_PENDING_REQUEST);
    }

    if (file) {
      if (backyCheck.document) {
        await this.awsS3Service.deleteObject(backyCheck.document.s3Key);

        await this.userDocumentRepository.update({ id: backyCheck.document.id }, { s3Key: file.key });
      }
    }

    await this.backyCheckRepository.update(backyCheck.id, {
      WWCCNumber: dto.WWCCNumber,
      expiredDate: dto.expiredDate,
      issueState: dto.issueState,
      checkStatus: dto.checkStatus,
      checkResults: dto.checkResults,
      checkResultsNotes: dto.checkResultsNotes,
      orderOfficerNotes: dto.orderOfficerNotes,
      manualCheckResults: EManualCheckResult.PENDING,
    });

    void this.sendEmailsToAdminsInBackground(backyCheck).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send backy check emails to admins:`, error.stack);
    });

    return { message: "WWCC request updated succesfully." };
  }

  public async getWWCCRequest(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<GetWwccOutput | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<BackyCheck> = isAdminOperation
      ? { userRole: { id: dto.id } }
      : { userRole: { id: user.userRoleId } };

    let result: GetWwccOutput | null = null;
    result = await this.backyCheckRepository.findOne({
      where: whereCondition,
      relations: { document: true, userRole: true },
    });

    if (result) {
      await this.accessControlService.authorizeUserRoleForOperation(user, result.userRole);
    }

    if (result?.document?.s3Key) {
      result.downloadLink = await this.awsS3Service.getShortLivedSignedUrl(result.document.s3Key);
    }

    return result;
  }

  public async statusManualDecision(dto: StatusManualDecisionDto, user: ITokenUserData): Promise<void> {
    const backyCheckRequest = await findOneOrFailTyped<BackyCheck>(dto.id, this.backyCheckRepository, {
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, backyCheckRequest.userRole);

    if (backyCheckRequest.manualCheckResults === EManualCheckResult.INITIAL) {
      throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_NO_UPLOADED_FILE);
    }

    await this.backyCheckRepository.update({ id: dto.id }, { manualCheckResults: dto.status });

    const isVerificationAccepted = dto.status === EManualCheckResult.MANUAL_APPROVED;

    if (isVerificationAccepted) {
      this.activationTrackingService.checkActivationStepsEnded(backyCheckRequest.userRole).catch((error: Error) => {
        this.lokiLogger.error(
          `checkActivationStepsEnded error, userRoleId: ${backyCheckRequest.userRole.id}`,
          error.stack,
        );
      });
    }

    await this.notifyUserAboutWWCCVerification(backyCheckRequest.userRole, isVerificationAccepted);
  }

  public async removeWWCCRequest(id: string, user: ITokenUserData): Promise<void> {
    const backyCheck = await findOneOrFailTyped<BackyCheck>(id, this.backyCheckRepository, {
      where: { id: id },
      relations: { userRole: true, document: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, backyCheck.userRole);

    if (
      backyCheck.checkStatus === EExtCheckStatus.OPEN ||
      backyCheck.checkStatus === EExtCheckStatus.IN_PROGRESS ||
      backyCheck.checkStatus === EExtCheckStatus.VERIFIED ||
      backyCheck.checkStatus === EExtCheckStatus.IN_REVIEW
    ) {
      throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_REQUEST_PENDING);
    }

    await this.backyCheckRepository.delete({ id });

    if (backyCheck.document) {
      await this.awsS3Service.deleteObject(backyCheck.document.s3Key);
    }

    return;
  }

  public async getRequests(orderIds: string[]): Promise<BackyCheck[]> {
    return await this.backyCheckRepository.find({
      where: [
        {
          orderId: In(orderIds),
          checkStatus: In([
            EExtCheckStatus.OPEN,
            EExtCheckStatus.IN_PROGRESS,
            EExtCheckStatus.VERIFIED,
            EExtCheckStatus.IN_REVIEW,
          ]),
          manualCheckResults: IsNull(),
          checkResults: IsNull(),
        },
        {
          orderId: In(orderIds),
          checkStatus: IsNull(),
          manualCheckResults: IsNull(),
          checkResults: IsNull(),
        },
      ],
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });
  }

  public async updateRequests(backyCheckRequests: BackyCheck[]): Promise<BackyCheck[]> {
    return await this.backyCheckRepository.save(backyCheckRequests);
  }

  public async activationTrackingTrigger(userRoles: UserRole[]): Promise<void> {
    const checkUserStepsPromises: Promise<void>[] = [];

    for (const userRole of userRoles) {
      checkUserStepsPromises.push(this.activationTrackingService.checkActivationStepsEnded(userRole));
    }

    await Promise.all(checkUserStepsPromises);
  }

  public async removeWWCCFile(id: string, user: ITokenUserData): Promise<void> {
    const backyCheck = await findOneOrFailTyped<BackyCheck>(id, this.backyCheckRepository, {
      where: { id },
      relations: { userRole: true, document: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, backyCheck.userRole);

    if (!backyCheck.document) {
      throw new BadRequestException(EBackyCheckErrorCodes.SERVICE_NO_UPLOADED_FILE);
    }

    await this.awsS3Service.deleteObject(backyCheck.document.s3Key);
    await this.userDocumentRepository.remove(backyCheck.document);

    return;
  }

  public async checkBackyCheckStatus(): Promise<void> {
    const backyCheckRequests = await this.backyCheckSdkService.getChecksSummary();

    const requestOrderIds: string[] = [];
    const backyCheckOrders: { [key: string]: IBackyCheckOrder } = {};

    for (const order of backyCheckRequests.orders) {
      requestOrderIds.push(order.orderID);
      backyCheckOrders[order.orderID] = order;
    }

    const requestsFromDb = await this.getRequests(requestOrderIds);
    const requestsForUpdate: BackyCheck[] = [];
    const userRolesOfUpdatingRequests: UserRole[] = [];

    for (const request of requestsFromDb) {
      const orderId = request.orderId;

      if (!orderId) {
        continue;
      }

      let isUpdated = false;

      if (request.checkStatus !== backyCheckOrders[orderId].CheckStatus) {
        request.checkStatus = backyCheckOrders[orderId].CheckStatus;
        isUpdated = true;
      }

      if (
        request.checkResults !== backyCheckOrders[orderId].CheckResults &&
        backyCheckOrders[orderId].CheckResults !== EExtCheckResult.NOT_AVAILABLE
      ) {
        request.checkResults = backyCheckOrders[orderId].CheckResults;
        isUpdated = true;
      }

      if (request.checkResultsNotes !== backyCheckOrders[orderId].CheckResultsNotes) {
        request.checkResultsNotes = backyCheckOrders[orderId].CheckResultsNotes;
        isUpdated = true;
      }

      if (request.orderOfficerNotes !== backyCheckOrders[orderId].OrderOfficerNotes) {
        request.orderOfficerNotes = backyCheckOrders[orderId].OrderOfficerNotes;
        isUpdated = true;
      }

      if (isUpdated) {
        requestsForUpdate.push(request);

        if (backyCheckOrders[orderId].CheckStatus === EExtCheckStatus.READY) {
          userRolesOfUpdatingRequests.push(request.userRole);
        }
      }

      if (
        backyCheckOrders[orderId].CheckStatus === EExtCheckStatus.READY ||
        backyCheckOrders[orderId].CheckStatus === EExtCheckStatus.CANCELLED
      ) {
        const isVerificationAccepted = backyCheckOrders[orderId].CheckStatus === EExtCheckStatus.READY;
        await this.notifyUserAboutWWCCVerification(request.userRole, isVerificationAccepted);
      }
    }

    await this.updateRequests(requestsForUpdate);
    await this.activationTrackingTrigger(userRolesOfUpdatingRequests);
  }

  private async notifyUserAboutWWCCVerification(userRole: UserRole, isVerificationAccepted: boolean): Promise<void> {
    const VERIFICATION = "WWCC";

    if (isVerificationAccepted) {
      this.emailsService.sendDocumentVerificationAccepted(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send backy check verification email for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
      this.notificationService.sendBackyCheckVerificationNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send backy check verification notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    } else {
      this.emailsService.sendDocumentVerificationRejected(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(`Failed to send backy check error email for userRoleId: ${userRole.id}`, error.stack);
      });
      this.notificationService.sendBackyCheckErrorNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send backy check error notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    }
  }

  private async sendEmailsToAdminsInBackground(backyCheck: BackyCheck): Promise<void> {
    const { userRole, issueState } = backyCheck;

    const superAdmins = await this.helperService.getSuperAdmin();
    const documentsAndPaymentLink = `${this.FRONT_END_URL}/members/details/${userRole.id}/documents_and_payment`;

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendBackyCheckNotifyToAdmin(
        superAdmin.email,
        userRole.user.platformId || "",
        issueState,
        documentsAndPaymentLink,
      );
    }
  }
}
