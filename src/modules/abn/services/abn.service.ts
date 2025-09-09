import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  UNDEFINED_VALUE,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
  REGEXP_SYMBOLS,
  MOCK_ENABLED,
} from "src/common/constants";
import { EAbnErrorCodes, EExtAbnStatus, EExtAbnTypeCode, EGstPayer } from "src/modules/abn/common/enums";
import { IAbnApiConnectionData, IAbnApiResponse, IAbnMessageWithReview } from "src/modules/abn/common/interface";
import { AbnCheck } from "src/modules/abn/entities";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { Company } from "src/modules/companies/entities";
import { EmailsService } from "src/modules/emails/services";
import { MockService } from "src/modules/mock/services";
import { UserRole } from "src/modules/users/entities";
import { User } from "src/modules/users/entities";
import { FindOptionsWhere, Repository } from "typeorm";
import { GetUserByAbnDto } from "src/modules/abn/common/dto";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { LokiLogger } from "src/common/logger";
import { IMessageOutput } from "src/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";
import { EMockType } from "src/modules/mock/common/enums";

@Injectable()
export class AbnService {
  private readonly lokiLogger = new LokiLogger(AbnService.name);
  private readonly FRONT_END_URL: string;

  public constructor(
    @InjectRepository(AbnCheck)
    private readonly abnCheckRepository: Repository<AbnCheck>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly configService: ConfigService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly mockService: MockService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getUserStatus(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<AbnCheck | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<AbnCheck> = isAdminOperation
      ? { userRole: { id: dto.id } }
      : { userRole: { id: user.userRoleId } };

    const anbCheck = await this.abnCheckRepository.findOne({
      where: whereCondition,
      relations: { userRole: true },
    });

    if (!anbCheck || !anbCheck.userRole) {
      throw new NotFoundException(EAbnErrorCodes.ABN_CHECK_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, anbCheck.userRole);

    return anbCheck;
  }

  public async getCompanyStatus(user: ITokenUserData, companyId?: string): Promise<AbnCheck | null> {
    const company = await this.accessControlService.getCompanyByRole(user, { abnCheck: true }, companyId);

    return company?.abnCheck ?? null;
  }

  public async getIndividualAbnVerificationStatus(user: ITokenUserData, dto: GetUserByAbnDto): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      where: whereCondition,
      relations: { profile: true, role: true, abnCheck: true, user: true },
    });

    if (!userRole) {
      throw new NotFoundException(EAbnErrorCodes.USER_NOT_FOUND);
    }

    if (userRole.isActive && userRole.abnCheck) {
      throw new BadRequestException(EAbnErrorCodes.USER_ROLE_INVALID_STATUS);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    let abnDetails: IAbnMessageWithReview;

    if (MOCK_ENABLED) {
      if (dto.abn === this.mockService.mockAbnNumber) {
        const userName = (userRole.profile.firstName + ", " + userRole.profile.lastName).toUpperCase();
        const mock = await this.mockService.processMock({
          type: EMockType.GET_ABN_VERIFICATION_STATUS,
          data: { userName },
        });
        abnDetails = mock.result;
      }

      if (dto.abn !== this.mockService.mockAbnNumber) {
        abnDetails = await this.getAbnDetails(dto.abn);
      }
    } else {
      abnDetails = await this.getAbnDetails(dto.abn);
    }

    const abnVerificationMessage = await this.verifyIndividualAbnStatus(abnDetails!, userRole, dto.abn);
    await this.createOrUpdateAbnCheck(abnDetails!, dto.isGstPayer, userRole);

    if (abnDetails!.abnStatus === EExtAbnStatus.ACTIVE) {
      this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
        this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
      });
    }

    return abnVerificationMessage;
  }

  public async getCorporateAbnVerificationStatus(
    user: ITokenUserData,
    abn: string,
    isGstPayer: EGstPayer,
    companyId?: string,
  ): Promise<IMessageOutput> {
    const isLfhAdminOperation = this.accessControlService.checkLfhAdminRoleForOperation(user);
    const whereCondition = isLfhAdminOperation ? { id: companyId } : { superAdminId: user.id };

    const company = await this.companyRepository.findOne({
      where: whereCondition,
      relations: { superAdmin: true, abnCheck: true },
    });

    if (!company) {
      throw new NotFoundException(EAbnErrorCodes.COMPANY_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, company);

    if (company.status !== ECompanyStatus.REGISTERED && company.status !== ECompanyStatus.UNDER_REVIEW) {
      throw new BadRequestException(EAbnErrorCodes.COMPANY_INVALID_STATUS);
    }

    let abnDetails: IAbnMessageWithReview;

    if (MOCK_ENABLED) {
      if (abn === this.mockService.mockAbnNumber) {
        const companyName = company.name.toUpperCase();
        const mock = await this.mockService.processMock({
          type: EMockType.GET_ABN_VERIFICATION_STATUS,
          data: { userName: companyName },
        });
        abnDetails = mock.result;
      }

      if (abn !== this.mockService.mockAbnNumber) {
        abnDetails = await this.getAbnDetails(abn);
      }
    } else {
      abnDetails = await this.getAbnDetails(abn);
    }

    const abnVerificationMessage = await this.verifyCorporateAbnStatus(abnDetails!, company, abn);

    await this.createOrUpdateAbnCheck(abnDetails!, isGstPayer, UNDEFINED_VALUE, company);

    return abnVerificationMessage;
  }

  private async getAbnDetails(abn: string): Promise<IAbnMessageWithReview> {
    const { baseUrl, guid } = this.configService.getOrThrow<IAbnApiConnectionData>("abn");

    const requestParams = `?abn=${encodeURIComponent(abn)}&guid=${encodeURIComponent(guid)}`;

    const response = await fetch(baseUrl + requestParams, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(EAbnErrorCodes.VERIFICATION_SERVICE_UNAVAILABLE);
    }

    const anbResponse = await response.text();

    const jsonMatch = anbResponse.match(/\{.*\}/)![0];
    const anbParsedResponse: IAbnApiResponse = JSON.parse(jsonMatch) as IAbnApiResponse;

    const IAbnMessageWithReview: IAbnMessageWithReview = {
      abnNumber: anbParsedResponse.Abn,
      abnStatus: anbParsedResponse.AbnStatus,
      abnStatusEffectiveFrom: anbParsedResponse.AbnStatusEffectiveFrom,
      acn: anbParsedResponse.Acn,
      addressDate: anbParsedResponse.AddressDate,
      addressPostcode: anbParsedResponse.AddressPostcode,
      addressState: anbParsedResponse.AddressState,
      businessName: anbParsedResponse.BusinessName,
      fullName: anbParsedResponse.EntityName,
      typeCode: anbParsedResponse.EntityTypeCode,
      typeName: anbParsedResponse.EntityTypeName,
      gst: anbParsedResponse.Gst,
      message: anbParsedResponse.Message,
    };

    return IAbnMessageWithReview;
  }

  private async verifyIndividualAbnStatus(
    abnDetails: IAbnMessageWithReview,
    userRole: UserRole,
    abnNumber: string,
  ): Promise<IMessageOutput> {
    let isVerificationAccepted = true;
    try {
      if (!abnDetails.abnNumber || (abnDetails.message && abnDetails.message.includes("not a valid ABN or ACN"))) {
        isVerificationAccepted = false;
        throw new NotFoundException(EAbnErrorCodes.VERIFICATION_INVALID_NUMBER);
      }

      if (abnDetails.abnStatus === EExtAbnStatus.CANCELLED) {
        isVerificationAccepted = false;
        throw new BadRequestException(EAbnErrorCodes.VERIFICATION_CANCELLED);
      }

      const fullNameFromAbn = abnDetails.fullName.toUpperCase().replace(REGEXP_SYMBOLS, " ").split(" ");

      const firstNameSplit = userRole.profile.firstName.toUpperCase().replace(REGEXP_SYMBOLS, " ").split(" ");
      const lastNameSplit = userRole.profile.lastName.toUpperCase().replace(REGEXP_SYMBOLS, " ").split(" ");
      const fullNameSplit = [...firstNameSplit, ...lastNameSplit];

      const nameMatched = fullNameSplit.every((item) => fullNameFromAbn.includes(item));

      if (!nameMatched) {
        isVerificationAccepted = false;
        throw new BadRequestException(EAbnErrorCodes.VERIFICATION_NAME_MISMATCH);
      }

      if (abnDetails.typeCode !== EExtAbnTypeCode.IND) {
        void this.sendEmailsToAdminsInBackground(userRole, abnDetails.typeCode).catch((error: Error) => {
          this.lokiLogger.error(`Failed to send abn check emails to admins:`, error.stack);
        });
      }

      return {
        message: "ABN verified successfully.",
      };
    } catch (error) {
      await this.logAbnCheckError((error as Error).message, abnNumber, userRole);
      throw error;
    } finally {
      await this.notifyUserAboutVerification(isVerificationAccepted, userRole.user);
    }
  }

  private async verifyCorporateAbnStatus(
    abnDetails: IAbnMessageWithReview,
    company: Company,
    abnNumber: string,
  ): Promise<IMessageOutput> {
    let isVerificationAccepted = true;
    try {
      if (!abnDetails.abnNumber || (abnDetails.message && abnDetails.message.includes("not a valid ABN or ACN"))) {
        isVerificationAccepted = false;
        throw new NotFoundException(EAbnErrorCodes.VERIFICATION_INVALID_NUMBER);
      }

      if (abnDetails.abnStatus === EExtAbnStatus.CANCELLED) {
        isVerificationAccepted = false;
        throw new BadRequestException(EAbnErrorCodes.VERIFICATION_CANCELLED);
      }

      const fullNameFromAbn = abnDetails.fullName.toUpperCase();
      const companyFullName = company.name.toUpperCase();

      if (fullNameFromAbn !== companyFullName) {
        isVerificationAccepted = false;
        throw new BadRequestException(EAbnErrorCodes.VERIFICATION_COMPANY_MISMATCH);
      }

      return {
        message: "ABN verified successfully.",
      };
    } catch (error) {
      await this.logAbnCheckError((error as Error).message, abnNumber, UNDEFINED_VALUE, company);
      throw error;
    } finally {
      await this.notifyUserAboutVerification(isVerificationAccepted, company.superAdmin);
    }
  }

  private async createOrUpdateAbnCheck(
    abnDetails: IAbnMessageWithReview,
    gstPayer?: EGstPayer,
    userRole?: UserRole,
    company?: Company,
  ): Promise<void> {
    if (!userRole && !company) {
      throw new BadRequestException(EAbnErrorCodes.PERMISSION_DENIED_CREATE_UPDATE);
    }

    let existingAbnCheck: AbnCheck | null = null;

    if (userRole) {
      existingAbnCheck = await this.abnCheckRepository.findOne({
        where: { userRole: { id: userRole.id } },
      });
    }

    if (company) {
      if (company.superAdminId) {
        existingAbnCheck = await this.abnCheckRepository.findOne({
          where: { company: { superAdminId: company.superAdminId } },
        });
      } else {
        this.lokiLogger.error(`Company ${company.id} does not have superAdminId`);
      }
    }

    if (!existingAbnCheck) {
      const createAbnCheck = this.abnCheckRepository.create({
        userRole: userRole,
        company: company,
        gstFromClient: gstPayer ?? null,
        ...abnDetails,
      });
      await this.abnCheckRepository.save(createAbnCheck);
    }

    if (existingAbnCheck) {
      let gstFromClient = existingAbnCheck.gstFromClient;

      if (gstPayer) {
        gstFromClient = gstPayer;
      }

      await this.abnCheckRepository.update(existingAbnCheck.id, { ...abnDetails, gstFromClient });
    }
  }

  public async logAbnCheckError(
    errorMessage: string,
    abnNumber: string,
    userRole?: UserRole,
    company?: Company,
  ): Promise<void> {
    if (!userRole && !company) {
      throw new BadRequestException(EAbnErrorCodes.PERMISSION_DENIED_CREATE_UPDATE);
    }

    let existingAbnCheck: AbnCheck | null = null;

    if (userRole) {
      existingAbnCheck = await this.abnCheckRepository.findOne({
        where: { userRole: { id: userRole.id } },
      });
    }

    if (company) {
      if (company.superAdminId) {
        existingAbnCheck = await this.abnCheckRepository.findOne({
          where: { company: { superAdminId: company.superAdminId } },
        });
      } else {
        this.lokiLogger.error(`Company ${company.id} does not have superAdminId`);
      }
    }

    if (existingAbnCheck) {
      await this.abnCheckRepository.update(existingAbnCheck.id, {
        abnNumber: abnNumber,
        abnStatus: null,
        abnStatusEffectiveFrom: null,
        acn: null,
        addressDate: null,
        addressPostcode: null,
        addressState: null,
        businessName: null,
        fullName: null,
        typeCode: null,
        typeName: null,
        gst: null,
        message: errorMessage,
      });
    }

    if (!existingAbnCheck) {
      const newAbnCheck = this.abnCheckRepository.create({
        userRole: userRole,
        company: company,
        abnNumber: abnNumber,
        abnStatus: null,
        abnStatusEffectiveFrom: null,
        acn: null,
        addressDate: null,
        addressPostcode: null,
        addressState: null,
        businessName: null,
        fullName: null,
        typeCode: null,
        typeName: null,
        gst: null,
        message: errorMessage,
      });

      await this.abnCheckRepository.save(newAbnCheck);
    }
  }

  private async notifyUserAboutVerification(isVerificationAccepted: boolean, user: User | null): Promise<void> {
    if (!user) {
      throw new BadRequestException(EAbnErrorCodes.USER_NOT_EXIST);
    }

    const VERIFICATION = "ABN";

    if (isVerificationAccepted) {
      this.emailsService.sendDocumentVerificationAccepted(user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(`Failed to send abn check verification email for user: ${user.id}`, error.stack);
      });
    } else {
      this.emailsService.sendDocumentVerificationRejected(user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(`Failed to send abn check rejected email for user: ${user.id}`, error.stack);
      });
    }
  }

  private async sendEmailsToAdminsInBackground(userRole: UserRole, abnTypeCode: string): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();
    const documentsAndPaymentLink = `${this.FRONT_END_URL}/members/details/${userRole.id}/documents_and_payment`;

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendAbnNotifyToAdmin(
        superAdmin.email,
        userRole.user.platformId || "",
        abnTypeCode,
        documentsAndPaymentLink,
      );
    }
  }

  public async removeAbnCheck(id: string, user: ITokenUserData): Promise<void> {
    const abnCheck = await this.abnCheckRepository.findOne({ where: { id }, relations: { userRole: true } });

    if (!abnCheck || !abnCheck.userRole) {
      throw new NotFoundException(EAbnErrorCodes.DELETE_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, abnCheck.userRole);

    await this.abnCheckRepository.remove(abnCheck);

    return;
  }
}
