import * as path from "path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { User, UserDocument, UserProfile } from "src/modules/users/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { LokiLogger } from "src/common/logger";
import { AccountActivationService } from "src/modules/account-activation/services";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { EExtSumSubReviewAnswer } from "src/modules/sumsub/common/enums";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { AbnCheck } from "src/modules/abn/entities";
import { BackyCheck } from "src/modules/backy-check/entities";
import { CustomInsurance } from "src/modules/interpreters/profile/entities";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { EExtCheckStatus, EManualCheckResult } from "src/modules/backy-check/common/enums";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { Address } from "src/modules/addresses/entities";
import { INTERPRETER_ROLES, UNDEFINED_VALUE } from "src/common/constants";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EFolderPath } from "src/modules/file-management/common/enums";
import {
  DataTransferFromExistingRolesToNewRoleQuery,
  TDataTransferFromExistingRolesToNewRole,
  TDataTransferFromExistingRolesToNewRoleUserRole,
  TTransferEntities,
  TTransferEntity,
} from "src/modules/data-transfer/common/types";
import {
  IStepTransferResult,
  IStepTransferResultWithOptionalTransferData,
} from "src/modules/data-transfer/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { HelperService } from "src/modules/helper/services";
import { EDataTransferErrorCodes } from "src/modules/data-transfer/common/enums";

@Injectable()
export class ActivationStepsTransferService {
  private readonly lokiLogger = new LokiLogger(ActivationStepsTransferService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(SumSubCheck)
    private readonly sumSubCheckRepository: Repository<SumSubCheck>,
    @InjectRepository(AbnCheck)
    private readonly abnCheckRepository: Repository<AbnCheck>,
    @InjectRepository(BackyCheck)
    private readonly backyCheckRepository: Repository<BackyCheck>,
    @InjectRepository(UserConcessionCard)
    private readonly userConcessionCardRepository: Repository<UserConcessionCard>,
    @InjectRepository(CustomInsurance)
    private readonly customInsuranceRepository: Repository<CustomInsurance>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    private readonly accountActivationService: AccountActivationService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
  ) {}

  public async dataTransferFromExistingRolesToNewRole(userId: string, roleName: EUserRoleName): Promise<void> {
    const user = await findOneOrFailTyped<TDataTransferFromExistingRolesToNewRole>(userId, this.userRepository, {
      select: DataTransferFromExistingRolesToNewRoleQuery.select,
      where: { id: userId },
      relations: DataTransferFromExistingRolesToNewRoleQuery.relations,
    });
    const currentUserRole = await this.helperService.getUserRoleByName<TDataTransferFromExistingRolesToNewRoleUserRole>(
      user,
      roleName,
    );

    const existingRoles = user.userRoles.filter((userRole) => userRole.role.name !== roleName);

    let roleActivationSteps = await this.accountActivationService.getRelations(
      currentUserRole.userId,
      currentUserRole.role.name,
    );

    let isDataTransferred = false;
    let userCountry: string | undefined;
    let userTimezone: string | undefined;
    let logMessage = `Data transferred to user role ${currentUserRole.role.name} (${currentUserRole.id}):`;

    const entitiesToInsert: TTransferEntity<TTransferEntities>[] = [];

    if (roleActivationSteps.userRoles?.profile) {
      const profileTransferResult = await this.transferProfile(currentUserRole, existingRoles);

      if (profileTransferResult) {
        entitiesToInsert.push({ entity: UserProfile, data: profileTransferResult.transferredEntity });

        isDataTransferred = true;

        if (profileTransferResult.existingRoleWithStep.country) {
          userCountry = profileTransferResult.existingRoleWithStep.country;
          currentUserRole.country = profileTransferResult.existingRoleWithStep.country;

          userTimezone = profileTransferResult.existingRoleWithStep.timezone ?? UNDEFINED_VALUE;
          currentUserRole.timezone = profileTransferResult.existingRoleWithStep.timezone;
        }

        logMessage += `\n  - profile from role ${profileTransferResult.existingRoleWithStep.role.name} (${profileTransferResult.existingRoleWithStep.id})`;
      }
    }

    if (roleActivationSteps.userRoles?.address) {
      const addressTransferResult = await this.transferAddress(currentUserRole, existingRoles);

      if (addressTransferResult) {
        entitiesToInsert.push({ entity: Address, data: addressTransferResult.transferredEntity });

        isDataTransferred = true;

        if (!userCountry) {
          if (!addressTransferResult.existingRoleWithStep.address) {
            throw new BadRequestException(EDataTransferErrorCodes.ADDRESS_NOT_FILLED);
          }

          userCountry = addressTransferResult.existingRoleWithStep.address.country;
          currentUserRole.country = addressTransferResult.existingRoleWithStep.address.country;

          userTimezone = addressTransferResult.existingRoleWithStep.address.timezone;
          currentUserRole.timezone = addressTransferResult.existingRoleWithStep.address.timezone;
        }

        logMessage += `\n  - address from role ${addressTransferResult.existingRoleWithStep.role.name} (${addressTransferResult.existingRoleWithStep.id})`;
      }
    }

    roleActivationSteps = await this.accountActivationService.getRelations(
      currentUserRole.userId,
      currentUserRole.role.name,
      userCountry,
    );

    if (roleActivationSteps.userRoles?.sumSubCheck) {
      const sumSubTransferResult = await this.transferSumSub(currentUserRole, existingRoles);

      if (sumSubTransferResult) {
        entitiesToInsert.push({ entity: SumSubCheck, data: sumSubTransferResult.transferredEntity });

        isDataTransferred = true;

        logMessage += `\n  - sumsub from role ${sumSubTransferResult.existingRoleWithStep.role.name} (${sumSubTransferResult.existingRoleWithStep.id})`;
      }
    }

    if (roleActivationSteps.userRoles?.abnCheck) {
      const abnTransferResult = await this.transferAbn(currentUserRole, existingRoles);

      if (abnTransferResult) {
        entitiesToInsert.push({ entity: AbnCheck, data: abnTransferResult.transferredEntity });

        isDataTransferred = true;

        logMessage += `\n  - abn from role ${abnTransferResult.existingRoleWithStep.role.name} (${abnTransferResult.existingRoleWithStep.id})`;
      }
    }

    if (roleActivationSteps.userRoles?.backyCheck) {
      const backyCheckTransferResult = await this.transferBackyCheck(currentUserRole, existingRoles);

      if (backyCheckTransferResult) {
        if (backyCheckTransferResult.transferredEntity) {
          entitiesToInsert.push({ entity: UserDocument, data: backyCheckTransferResult.transferredEntity });
        }

        isDataTransferred = true;

        logMessage += `\n  - backycheck from role ${backyCheckTransferResult.existingRoleWithStep.role.name} (${backyCheckTransferResult.existingRoleWithStep.id})`;
      }
    }

    if (roleActivationSteps.userRoles?.userConcessionCard) {
      const concessionCardTransferResult = await this.transferConcessionCard(currentUserRole, existingRoles);

      if (concessionCardTransferResult) {
        if (concessionCardTransferResult.transferredEntity) {
          entitiesToInsert.push({ entity: UserDocument, data: concessionCardTransferResult.transferredEntity });
        }

        isDataTransferred = true;

        logMessage += `\n  - concession card from role ${concessionCardTransferResult.existingRoleWithStep.role.name} (${concessionCardTransferResult.existingRoleWithStep.id})`;
      }
    }

    if (roleActivationSteps.userRoles?.customInsurance) {
      const customInsuranceTransferResult = await this.transferCustomInsurance(currentUserRole, existingRoles);

      if (customInsuranceTransferResult) {
        entitiesToInsert.push({ entity: CustomInsurance, data: customInsuranceTransferResult.transferredEntity });

        isDataTransferred = true;

        logMessage += `\n  - custom insurance from role ${customInsuranceTransferResult.existingRoleWithStep.role.name} (${customInsuranceTransferResult.existingRoleWithStep.id})`;
      }
    }

    if (isDataTransferred) {
      this.lokiLogger.debug(logMessage);

      await this.saveTransferredData(entitiesToInsert, currentUserRole.id, userCountry, userTimezone);

      this.activationTrackingService.checkActivationStepsEnded(currentUserRole).catch((error: Error) => {
        this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${currentUserRole.id}`, error.stack);
      });
    }
  }

  private async transferProfile(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResult | undefined> {
    let existingRoleWithProfile: TDataTransferFromExistingRolesToNewRoleUserRole | undefined;

    if (isInRoles(INTERPRETER_ROLES, currentRole.role.name)) {
      existingRoleWithProfile = existingRoles.find(
        (userRole) =>
          userRole.profile !== UNDEFINED_VALUE &&
          userRole.profile !== null &&
          userRole.isActive &&
          isInRoles(INTERPRETER_ROLES, userRole.role.name),
      );
    }

    if (!isInRoles(INTERPRETER_ROLES, currentRole.role.name) || !existingRoleWithProfile) {
      existingRoleWithProfile = existingRoles.find(
        (userRole) => userRole.profile !== UNDEFINED_VALUE && userRole.profile !== null && userRole.isActive,
      );
    }

    if (existingRoleWithProfile) {
      const newProfile = this.userProfileRepository.create({
        title: existingRoleWithProfile.profile.title,
        firstName: existingRoleWithProfile.profile.firstName,
        middleName: existingRoleWithProfile.profile.middleName,
        lastName: existingRoleWithProfile.profile.lastName,
        preferredName: existingRoleWithProfile.profile.preferredName,
        dateOfBirth: existingRoleWithProfile.profile.dateOfBirth,
        gender: existingRoleWithProfile.profile.gender,
        contactEmail: existingRoleWithProfile.profile.contactEmail,
        nativeLanguage: existingRoleWithProfile.profile.nativeLanguage,
        isIdentifyAsAboriginalOrTorresStraitIslander:
          existingRoleWithProfile.profile.isIdentifyAsAboriginalOrTorresStraitIslander,
        userRole: currentRole,
      });

      return { transferredEntity: newProfile, existingRoleWithStep: existingRoleWithProfile };
    }

    return;
  }

  private async transferAddress(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResult | undefined> {
    let existingRoleWithAddress: TDataTransferFromExistingRolesToNewRoleUserRole | undefined;

    if (isInRoles(INTERPRETER_ROLES, currentRole.role.name)) {
      existingRoleWithAddress = existingRoles.find(
        (userRole) =>
          userRole.address !== UNDEFINED_VALUE &&
          userRole.address !== null &&
          userRole.isActive &&
          isInRoles(INTERPRETER_ROLES, userRole.role.name),
      );
    }

    if (!isInRoles(INTERPRETER_ROLES, currentRole.role.name) || !existingRoleWithAddress) {
      existingRoleWithAddress = existingRoles.find(
        (userRole) => userRole.address !== UNDEFINED_VALUE && userRole.address !== null && userRole.isActive,
      );
    }

    if (existingRoleWithAddress) {
      if (
        !existingRoleWithAddress.address ||
        !existingRoleWithAddress.address.streetNumber ||
        !existingRoleWithAddress.address.streetName ||
        !existingRoleWithAddress.address.suburb ||
        !existingRoleWithAddress.address.state ||
        !existingRoleWithAddress.address.postcode
      ) {
        throw new BadRequestException(EDataTransferErrorCodes.ADDRESS_NOT_FILLED);
      }

      const newAddress = this.addressRepository.create({
        latitude: existingRoleWithAddress.address.latitude,
        longitude: existingRoleWithAddress.address.longitude,
        organizationName: existingRoleWithAddress.address.organizationName,
        country: existingRoleWithAddress.address.country,
        state: existingRoleWithAddress.address.state,
        suburb: existingRoleWithAddress.address.suburb,
        streetName: existingRoleWithAddress.address.streetName,
        streetNumber: existingRoleWithAddress.address.streetNumber,
        postcode: existingRoleWithAddress.address.postcode,
        building: existingRoleWithAddress.address.building,
        unit: existingRoleWithAddress.address.unit,
        timezone: existingRoleWithAddress.address.timezone,
        userRole: currentRole,
      });

      return { transferredEntity: newAddress, existingRoleWithStep: existingRoleWithAddress };
    }

    return;
  }

  private async transferSumSub(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResult | undefined> {
    const existingRoleWithSumSub = existingRoles.find(
      (userRole) => userRole.sumSubCheck !== UNDEFINED_VALUE && userRole.sumSubCheck !== null && userRole.isActive,
    );

    if (
      existingRoleWithSumSub &&
      existingRoleWithSumSub.sumSubCheck &&
      existingRoleWithSumSub.sumSubCheck.reviewAnswer === EExtSumSubReviewAnswer.GREEN
    ) {
      const newSumSubCheck = this.sumSubCheckRepository.create({
        applicantId: existingRoleWithSumSub.sumSubCheck.applicantId,
        inspectionId: existingRoleWithSumSub.sumSubCheck.inspectionId,
        applicantType: existingRoleWithSumSub.sumSubCheck.applicantType,
        correlationId: existingRoleWithSumSub.sumSubCheck.correlationId,
        levelName: existingRoleWithSumSub.sumSubCheck.levelName,
        sandboxMode: existingRoleWithSumSub.sumSubCheck.sandboxMode,
        externalUserId: existingRoleWithSumSub.sumSubCheck.externalUserId,
        webhookType: existingRoleWithSumSub.sumSubCheck.webhookType,
        reviewStatus: existingRoleWithSumSub.sumSubCheck.reviewStatus,
        moderationComment: existingRoleWithSumSub.sumSubCheck.moderationComment,
        clientComment: existingRoleWithSumSub.sumSubCheck.clientComment,
        reviewAnswer: existingRoleWithSumSub.sumSubCheck.reviewAnswer,
        rejectLabels: existingRoleWithSumSub.sumSubCheck.rejectLabels,
        reviewRejectType: existingRoleWithSumSub.sumSubCheck.reviewRejectType,
        buttonIds: existingRoleWithSumSub.sumSubCheck.buttonIds,
        userRole: currentRole,
      });

      return { transferredEntity: newSumSubCheck, existingRoleWithStep: existingRoleWithSumSub };
    }

    return;
  }

  private async transferAbn(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResult | undefined> {
    const existingRoleWithAbn = existingRoles.find(
      (userRole) => userRole.abnCheck !== UNDEFINED_VALUE && userRole.abnCheck !== null && userRole.isActive,
    );

    if (
      existingRoleWithAbn &&
      existingRoleWithAbn.abnCheck &&
      existingRoleWithAbn.abnCheck.abnStatus === EExtAbnStatus.ACTIVE
    ) {
      const newAbnCheck = this.abnCheckRepository.create({
        abnNumber: existingRoleWithAbn.abnCheck.abnNumber,
        abnStatus: existingRoleWithAbn.abnCheck.abnStatus,
        abnStatusEffectiveFrom: existingRoleWithAbn.abnCheck.abnStatusEffectiveFrom,
        acn: existingRoleWithAbn.abnCheck.acn,
        addressDate: existingRoleWithAbn.abnCheck.addressDate,
        addressPostcode: existingRoleWithAbn.abnCheck.addressPostcode,
        addressState: existingRoleWithAbn.abnCheck.addressState,
        businessName: existingRoleWithAbn.abnCheck.businessName,
        fullName: existingRoleWithAbn.abnCheck.fullName,
        typeCode: existingRoleWithAbn.abnCheck.typeCode,
        typeName: existingRoleWithAbn.abnCheck.typeName,
        gst: existingRoleWithAbn.abnCheck.gst,
        gstFromClient: existingRoleWithAbn.abnCheck.gstFromClient,
        message: existingRoleWithAbn.abnCheck.message,
        userRole: currentRole,
      });

      return { transferredEntity: newAbnCheck, existingRoleWithStep: existingRoleWithAbn };
    }

    return;
  }

  private async transferBackyCheck(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResultWithOptionalTransferData | undefined> {
    const existingRoleWithBackyCheck = existingRoles.find(
      (userRole) => userRole.backyCheck !== UNDEFINED_VALUE && userRole.backyCheck !== null && userRole.isActive,
    );

    if (
      existingRoleWithBackyCheck &&
      existingRoleWithBackyCheck.backyCheck &&
      (existingRoleWithBackyCheck.backyCheck.checkStatus === EExtCheckStatus.READY ||
        existingRoleWithBackyCheck.backyCheck.manualCheckResults === EManualCheckResult.MANUAL_APPROVED)
    ) {
      const newBackyCheck = this.backyCheckRepository.create({
        WWCCNumber: existingRoleWithBackyCheck.backyCheck.WWCCNumber,
        expiredDate: existingRoleWithBackyCheck.backyCheck.expiredDate,
        issueState: existingRoleWithBackyCheck.backyCheck.issueState,
        orderId: existingRoleWithBackyCheck.backyCheck.orderId,
        checkStatus: existingRoleWithBackyCheck.backyCheck.checkStatus,
        checkResults: existingRoleWithBackyCheck.backyCheck.checkResults,
        manualCheckResults: existingRoleWithBackyCheck.backyCheck.manualCheckResults,
        checkResultsNotes: existingRoleWithBackyCheck.backyCheck.checkResultsNotes,
        orderOfficerNotes: existingRoleWithBackyCheck.backyCheck.orderOfficerNotes,
        userRole: currentRole,
      });

      const savedBackyCheck = await this.backyCheckRepository.save(newBackyCheck);

      let newDocument: UserDocument | undefined;

      if (existingRoleWithBackyCheck.backyCheck.document) {
        const fileExtension = path.extname(existingRoleWithBackyCheck.backyCheck.document.s3Key);
        const key = `${EFolderPath.BACKY_CHECK}/${currentRole.role.name}/${new Date().getTime()}${fileExtension}`;
        await this.awsS3Service.copyObject(key, existingRoleWithBackyCheck.backyCheck.document.s3Key);

        newDocument = this.userDocumentRepository.create({
          documentType: existingRoleWithBackyCheck.backyCheck.document.documentType,
          s3Key: key,
          userRole: currentRole,
          backyCheck: savedBackyCheck,
        });
      }

      return { transferredEntity: newDocument, existingRoleWithStep: existingRoleWithBackyCheck };
    }

    return;
  }

  private async transferConcessionCard(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResultWithOptionalTransferData | undefined> {
    const existingRoleWithConcessionCard = existingRoles.find(
      (userRole) =>
        userRole.userConcessionCard !== UNDEFINED_VALUE && userRole.userConcessionCard !== null && userRole.isActive,
    );

    if (
      existingRoleWithConcessionCard &&
      existingRoleWithConcessionCard.userConcessionCard &&
      existingRoleWithConcessionCard.userConcessionCard.status === EUserConcessionCardStatus.VERIFIED
    ) {
      const newUserConcessionCard = this.userConcessionCardRepository.create({
        centerlinkPensionerConcessionCardNumber:
          existingRoleWithConcessionCard.userConcessionCard.centerlinkPensionerConcessionCardNumber,
        veteranAffairsPensionerConcessionCardNumber:
          existingRoleWithConcessionCard.userConcessionCard.veteranAffairsPensionerConcessionCardNumber,
        status: existingRoleWithConcessionCard.userConcessionCard.status,
        userRole: currentRole,
      });

      const savedUserConcessionCard = await this.userConcessionCardRepository.save(newUserConcessionCard);

      let newDocument: UserDocument | undefined;

      if (existingRoleWithConcessionCard.userConcessionCard.document) {
        const fileExtension = path.extname(existingRoleWithConcessionCard.userConcessionCard.document.s3Key);
        const key = `${EFolderPath.CONCESSION_CARD}/${currentRole.role.name}/${new Date().getTime()}${fileExtension}`;
        await this.awsS3Service.copyObject(key, existingRoleWithConcessionCard.userConcessionCard.document.s3Key);

        newDocument = this.userDocumentRepository.create({
          documentType: existingRoleWithConcessionCard.userConcessionCard.document.documentType,
          s3Key: existingRoleWithConcessionCard.userConcessionCard.document.s3Key,
          userRole: currentRole,
          userConcessionCard: savedUserConcessionCard,
        });
      }

      return { transferredEntity: newDocument, existingRoleWithStep: existingRoleWithConcessionCard };
    }

    return;
  }

  private async transferCustomInsurance(
    currentRole: TDataTransferFromExistingRolesToNewRoleUserRole,
    existingRoles: TDataTransferFromExistingRolesToNewRoleUserRole[],
  ): Promise<IStepTransferResult | undefined> {
    const existingRoleWithCustomInsurance = existingRoles.find(
      (userRole) =>
        userRole.customInsurance !== UNDEFINED_VALUE && userRole.customInsurance !== null && userRole.isActive,
    );

    if (existingRoleWithCustomInsurance && existingRoleWithCustomInsurance.customInsurance) {
      const newCustomInsurance = this.customInsuranceRepository.create({
        insuredParty: existingRoleWithCustomInsurance.customInsurance.insuredParty,
        insuranceCompany: existingRoleWithCustomInsurance.customInsurance.insuranceCompany,
        policyNumber: existingRoleWithCustomInsurance.customInsurance.policyNumber,
        coverageLimit: existingRoleWithCustomInsurance.customInsurance.coverageLimit,
        userRole: currentRole,
      });

      return { transferredEntity: newCustomInsurance, existingRoleWithStep: existingRoleWithCustomInsurance };
    }

    return;
  }

  private async saveTransferredData(
    entitiesToInsert: TTransferEntity<TTransferEntities>[],
    currentRoleId: string,
    userCountry?: string,
    userTimezone?: string,
  ): Promise<void> {
    const queryRunner = this.userRoleRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const { entity, data } of entitiesToInsert) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(entity)
          .values({ ...data })
          .execute();
      }

      if (userCountry) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(UserRole)
          .set({ country: userCountry, timezone: userTimezone })
          .where("id = :id", { id: currentRoleId })
          .execute();
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
