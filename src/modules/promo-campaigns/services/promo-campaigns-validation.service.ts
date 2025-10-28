import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { isAfter, isBefore, isToday } from "date-fns";
import { PromoCampaign, PromoCampaignAssignment, PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import {
  CreateCorporatePromoCampaignDto,
  CreatePersonalPromoCampaignDto,
  UpdatePromoCampaignDto,
} from "src/modules/promo-campaigns/common/dto";
import {
  EPromoCampaignTarget,
  EPromoCampaignStatus,
  EPromoCampaignApplication,
  EPromoCampaignsErrorCodes,
} from "src/modules/promo-campaigns/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import {
  TAssignPromoCampaign,
  TAssignPromoCampaignUserRole,
  TCreateCorporatePromoCampaign,
  TUpdatePromoCampaign,
  TValidatePromoCampaignAssignmentAvailability,
  TValidatePromoCampaignAssignmentAvailabilityAppointment,
} from "src/modules/promo-campaigns/common/types";
import { PromoCampaignQueryOptionsService } from "src/modules/promo-campaigns/services";
import { ECompanyType } from "src/modules/companies/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class PromoCampaignsValidationService {
  constructor(
    @InjectRepository(PromoCampaign)
    private readonly promoCampaignRepository: Repository<PromoCampaign>,
    @InjectRepository(PromoCampaignAssignment)
    private readonly promoCampaignAssignmentRepository: Repository<PromoCampaignAssignment>,
    @InjectRepository(PromoCampaignBanner)
    private readonly promoCampaignBannerRepository: Repository<PromoCampaignBanner>,
    private readonly promoCampaignQueryOptionsService: PromoCampaignQueryOptionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  /**
   ** PromoCampaignsService
   */

  public async validatePersonalPromoCampaignCreate(dto: CreatePersonalPromoCampaignDto): Promise<void> {
    await this.validateBasicConstraints(dto.name, dto.promoCode, dto.startDate, dto.endDate);
    this.validateFieldsAllowedByTarget(dto, dto.target);

    if (dto.target === EPromoCampaignTarget.ALL_NEW_PERSONAL) {
      await this.validateAllNewPersonalConstraints(dto.startDate, dto.endDate ?? null);
    }

    if (dto.bannerId) {
      await this.validateBannerExists(dto.bannerId);
    }
  }

  public async validateCorporatePromoCampaignCreate(
    dto: CreateCorporatePromoCampaignDto,
    company: TCreateCorporatePromoCampaign,
  ): Promise<void> {
    this.validateCompanyType(company.companyType);
    await this.validateBasicConstraints(dto.name, dto.promoCode, dto.startDate, dto.endDate);

    if (dto.validateHolder) {
      await this.validateCorporateAssignmentUniqueness(company.id);
    }
  }

  public async validatePromoCampaignUpdate(
    dto: UpdatePromoCampaignDto,
    promoCampaign: TUpdatePromoCampaign,
  ): Promise<void> {
    if (promoCampaign.status === EPromoCampaignStatus.COMPLETED) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.CAMPAIGN_NOT_UPDATABLE);
    }

    this.validateUpdateRestrictions(dto, promoCampaign);

    await this.validateUpdateData(dto, promoCampaign);

    await this.validateSpecialConstraints(dto, promoCampaign);
  }

  private async validateBasicConstraints(
    name?: string,
    promoCode?: string,
    startDate?: Date,
    endDate?: Date | null,
    excludeId?: string,
  ): Promise<void> {
    await this.validatePromoCampaignUniqueness(name, promoCode, excludeId);

    if (startDate && endDate !== UNDEFINED_VALUE) {
      this.validateDateSequence(startDate, endDate);
    }
  }

  private validateUpdateRestrictions(dto: UpdatePromoCampaignDto, promoCampaign: TUpdatePromoCampaign): void {
    const isCorporate = promoCampaign.target === EPromoCampaignTarget.CORPORATE_COMPANY;
    const isRestrictedStatus =
      promoCampaign.status === EPromoCampaignStatus.ON_GOING ||
      promoCampaign.status === EPromoCampaignStatus.TERMINATED;

    if (isCorporate) {
      this.validateCorporateUpdateFields(dto);
    }

    if (isRestrictedStatus) {
      this.validateRestrictedStatusFields(dto, isCorporate);
      const finalTarget = dto.target ?? promoCampaign.target;
      this.validateFieldsAllowedByTarget(dto, finalTarget, promoCampaign);
    }
  }

  private async validateUpdateData(dto: UpdatePromoCampaignDto, promoCampaign: TUpdatePromoCampaign): Promise<void> {
    if (dto.status && !isAfter(new Date(), promoCampaign.startDate)) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.STATUS_CHANGE_BEFORE_START);
    }

    await this.validateBasicConstraints(
      dto.name,
      dto.promoCode,
      dto.startDate,
      dto.endDate !== UNDEFINED_VALUE ? dto.endDate : UNDEFINED_VALUE,
      promoCampaign.id,
    );

    if (dto.bannerId) {
      await this.validateBannerExists(dto.bannerId);
    }

    if (dto.startDate || dto.endDate !== UNDEFINED_VALUE) {
      const finalStartDate = dto.startDate ?? promoCampaign.startDate;
      const finalEndDate = dto.endDate !== UNDEFINED_VALUE ? dto.endDate : promoCampaign.endDate;
      this.validateDateSequence(finalStartDate, finalEndDate);
    }
  }

  private async validateSpecialConstraints(
    dto: UpdatePromoCampaignDto,
    promoCampaign: TUpdatePromoCampaign,
  ): Promise<void> {
    if (this.shouldValidateAllNewPersonal(dto, promoCampaign)) {
      const finalStartDate = dto.startDate ?? promoCampaign.startDate;
      const finalEndDate = dto.endDate !== UNDEFINED_VALUE ? dto.endDate : promoCampaign.endDate;

      await this.validateAllNewPersonalConstraints(finalStartDate, finalEndDate, promoCampaign.id);
    }
  }

  private validateCompanyType(companyType: ECompanyType): void {
    if (companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.CORPORATE_PROVIDER_NOT_ALLOWED);
    }
  }

  private async validateCorporateAssignmentUniqueness(companyId: string): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.validateCorporatePromoCampaignCreateOptions(companyId);
    const isAlreadyAssigned = await this.promoCampaignAssignmentRepository.exists(queryOptions);

    if (isAlreadyAssigned) {
      throw new BadRequestException({
        message: EPromoCampaignsErrorCodes.COMPANY_ALREADY_ASSIGNED,
        isPromoAssigned: true,
      });
    }
  }

  private validateCorporateUpdateFields(dto: UpdatePromoCampaignDto): void {
    const restrictedFields: Array<keyof UpdatePromoCampaignDto> = ["target", "partnerName", "bannerId"];
    const changedFields = restrictedFields.filter((field) => dto[field] !== UNDEFINED_VALUE);

    if (changedFields.length > 0) {
      throw new BadRequestException({
        message: EPromoCampaignsErrorCodes.CORPORATE_FIELDS_NOT_UPDATABLE,
        isPromoAssigned: true,
        variables: { fields: changedFields.join(", ") },
      });
    }
  }

  private validateRestrictedStatusFields(dto: UpdatePromoCampaignDto, isCorporate: boolean): void {
    const baseFields: Array<keyof UpdatePromoCampaignDto> = ["status", "bannerDisplay", "conditionsUrl"];
    const allowedFields = isCorporate ? baseFields : [...baseFields, "bannerId"];

    const providedFields = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdatePromoCampaignDto] !== UNDEFINED_VALUE,
    );
    const restrictedFields = providedFields.filter(
      (field) => !allowedFields.includes(field as keyof UpdatePromoCampaignDto),
    );

    if (restrictedFields.length > 0) {
      throw new BadRequestException({
        message: EPromoCampaignsErrorCodes.RESTRICTED_STATUS_FIELDS,
        isPromoAssigned: true,
        variables: { fields: allowedFields.join(", ") },
      });
    }
  }

  private shouldValidateAllNewPersonal(dto: UpdatePromoCampaignDto, existingCampaign: TUpdatePromoCampaign): boolean {
    const targetChangingToAllNew = dto.target === EPromoCampaignTarget.ALL_NEW_PERSONAL;
    const alreadyAllNewAndDatesChanging =
      existingCampaign.target === EPromoCampaignTarget.ALL_NEW_PERSONAL &&
      (dto.startDate !== UNDEFINED_VALUE || dto.endDate !== UNDEFINED_VALUE);

    return targetChangingToAllNew || alreadyAllNewAndDatesChanging;
  }

  private async validatePromoCampaignUniqueness(
    name: string | undefined,
    promoCode: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    if (!name && !promoCode) {
      return;
    }

    const queryOptions = this.promoCampaignQueryOptionsService.validatePromoCampaignUniquenessOptions(
      name,
      promoCode,
      excludeId,
    );
    const existingPromo = await this.promoCampaignRepository.exists(queryOptions);

    if (existingPromo) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.NAME_OR_CODE_EXISTS);
    }
  }

  private async validateAllNewPersonalConstraints(
    startDate: Date,
    endDate: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.validateAllNewPersonalConstraintsOptions(
      startDate,
      endDate,
      excludeId,
    );
    const conflictingPromo = await this.promoCampaignRepository.exists(queryOptions);

    if (conflictingPromo) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.ALL_NEW_PERSONAL_CONFLICT);
    }
  }

  private async validateBannerExists(bannerId: string): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.validateBannerExistsOptions(bannerId);
    const isPromoCampaignBannerExist = await this.promoCampaignBannerRepository.exists(queryOptions);

    if (!isPromoCampaignBannerExist) {
      throw new NotFoundException(EPromoCampaignsErrorCodes.BANNER_NOT_FOUND);
    }
  }

  private validateDateSequence(startDate: Date, endDate?: Date | null): void {
    if (endDate && !isBefore(startDate, endDate)) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.START_DATE_AFTER_END_DATE);
    }
  }

  /**
   ** PromoCampaignsAssignmentService
   */

  public async validateAssignPromoCampaign(
    user: ITokenUserData,
    promoCampaign: TAssignPromoCampaign,
    userRole: TAssignPromoCampaignUserRole,
  ): Promise<void> {
    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (
      promoCampaign.target === EPromoCampaignTarget.CORPORATE_COMPANY ||
      promoCampaign.target === EPromoCampaignTarget.ALL_NEW_PERSONAL ||
      promoCampaign.status !== EPromoCampaignStatus.ON_GOING
    ) {
      throw new BadRequestException(EPromoCampaignsErrorCodes.INVALID_PROMO_CODE);
    }

    if (promoCampaign.target === EPromoCampaignTarget.PERSONAL) {
      const queryOptions = this.promoCampaignQueryOptionsService.validateAssignPersonalPromoCampaignOptions(
        promoCampaign.id,
        userRole.id,
      );
      const isAlreadyAssigned = await this.promoCampaignAssignmentRepository.exists(queryOptions);

      if (isAlreadyAssigned) {
        throw new BadRequestException(EPromoCampaignsErrorCodes.PERSONAL_ALREADY_ASSIGNED);
      }
    }
  }

  /**
   ** DiscountHoldersService
   */

  public validatePromoCampaignAssignmentAvailability(
    promoCampaignAssignment: TValidatePromoCampaignAssignmentAvailability,
    appointment: TValidatePromoCampaignAssignmentAvailabilityAppointment,
  ): boolean {
    const { promoCampaign } = promoCampaignAssignment;

    const isPromoCampaignAvailable = this.validatePromoCampaignStep(promoCampaign);
    const isPromoAssignmentAvailable = this.validatePromoCampaignAssignmentStep(
      promoCampaignAssignment,
      promoCampaign.application,
    );
    const isAppointmentServicesSupported = this.validateAppointmentServicesStep(promoCampaign, appointment);

    return isPromoCampaignAvailable && isPromoAssignmentAvailable && isAppointmentServicesSupported;
  }

  private validatePromoCampaignStep(
    promoCampaign: TValidatePromoCampaignAssignmentAvailability["promoCampaign"],
  ): boolean {
    const isCampaignActive = promoCampaign.status === EPromoCampaignStatus.ON_GOING;
    const isCampaignNotExpired = !promoCampaign.endDate || !isBefore(promoCampaign.endDate, new Date());

    return isCampaignActive && isCampaignNotExpired;
  }

  private validatePromoCampaignAssignmentStep(
    promoCampaignAssignment: TValidatePromoCampaignAssignmentAvailability,
    application: EPromoCampaignApplication,
  ): boolean {
    if (application === EPromoCampaignApplication.DAILY) {
      return this.validateDailyApplicationAssignment(promoCampaignAssignment);
    } else {
      return this.validateAssignmentRemainingResources(promoCampaignAssignment);
    }
  }

  private validateDailyApplicationAssignment(
    promoCampaignAssignment: TValidatePromoCampaignAssignmentAvailability,
  ): boolean {
    const { lastUsedDate } = promoCampaignAssignment;

    const isNeverUsed = !lastUsedDate;
    const isUsedToday = lastUsedDate && isToday(lastUsedDate);

    if (isNeverUsed || !isUsedToday) {
      return true;
    }

    return this.validateAssignmentRemainingResources(promoCampaignAssignment);
  }

  private validateAssignmentRemainingResources(
    promoCampaignAssignment: TValidatePromoCampaignAssignmentAvailability,
  ): boolean {
    const { remainingUses, discountMinutes } = promoCampaignAssignment;

    const hasRemainingUses = remainingUses === null || remainingUses > 0;
    const hasDiscountMinutes = discountMinutes === null || discountMinutes > 0;

    return hasRemainingUses && hasDiscountMinutes;
  }

  private validateAppointmentServicesStep(
    promoCampaign: TValidatePromoCampaignAssignmentAvailability["promoCampaign"],
    appointment: TValidatePromoCampaignAssignmentAvailabilityAppointment,
  ): boolean {
    const serviceChecks = [
      promoCampaign.communicationTypes.includes(appointment.communicationType),
      promoCampaign.schedulingTypes.includes(appointment.schedulingType),
      promoCampaign.topics.includes(appointment.topic),
      promoCampaign.interpreterTypes.includes(appointment.interpreterType),
      promoCampaign.interpretingTypes.includes(appointment.interpretingType),
    ];

    return serviceChecks.every(Boolean);
  }

  private validateFieldsAllowedByTarget(
    dto: CreatePersonalPromoCampaignDto | UpdatePromoCampaignDto,
    target: EPromoCampaignTarget,
    existingCampaign?: TUpdatePromoCampaign,
  ): void {
    const ALLOWED_TARGETS: EPromoCampaignTarget[] = [
      EPromoCampaignTarget.GENERAL,
      EPromoCampaignTarget.ALL_NEW_PERSONAL,
    ];

    const bannerDisplayProvided = dto.bannerDisplay !== UNDEFINED_VALUE;
    const conditionsUrlProvided = dto.conditionsUrl !== UNDEFINED_VALUE;

    if (!bannerDisplayProvided && !conditionsUrlProvided) {
      return;
    }

    if (conditionsUrlProvided && !ALLOWED_TARGETS.includes(target)) {
      throw new BadRequestException({
        message: EPromoCampaignsErrorCodes.CONDITIONS_URL_TARGET_INVALID,
        variables: { fields: ALLOWED_TARGETS.join(", ") },
      });
    }

    if (bannerDisplayProvided) {
      const bannerDisplayValue = Boolean(dto.bannerDisplay);

      if (ALLOWED_TARGETS.includes(target)) {
        if (bannerDisplayValue === true) {
          const finalBannerId = dto.bannerId !== UNDEFINED_VALUE ? dto.bannerId : existingCampaign?.banner;

          if (!finalBannerId) {
            throw new BadRequestException(EPromoCampaignsErrorCodes.BANNER_DISPLAY_WITHOUT_BANNER);
          }
        }
      } else {
        if (bannerDisplayValue === true) {
          throw new BadRequestException({
            message: EPromoCampaignsErrorCodes.BANNER_DISPLAY_TARGET_INVALID,
            variables: { fields: ALLOWED_TARGETS.join(", ") },
          });
        }
      }
    }
  }
}
