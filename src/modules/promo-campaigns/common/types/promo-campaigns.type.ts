import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { ICorporatePromoCampaign, IPersonalPromoCampaign } from "src/modules/promo-campaigns/common/interfaces";
import { Company } from "src/modules/companies/entities";
import { PromoCampaign, PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { EAppointmentInterpretingType } from "src/modules/appointments/appointment/common/enums";
import { EPromoCampaignStatus, EPromoCampaignTarget } from "src/modules/promo-campaigns/common/enums";

/**
 ** Type
 */

export type IPromoCampaignBanner = Pick<PromoCampaignBanner, "id">;

export type TCreatePromoCampaignInterpretingType = typeof EAppointmentInterpretingType.CONSECUTIVE;

export type TPersonalPromoCampaignDtoTarget = Exclude<
  EPromoCampaignTarget,
  typeof EPromoCampaignTarget.CORPORATE_COMPANY
>;

export type TUpdatePromoCampaignDtoStatus = Exclude<
  EPromoCampaignStatus,
  typeof EPromoCampaignStatus.COMPLETED | typeof EPromoCampaignStatus.PENDING
>;

export type TGetAllPromoCampaigns = Pick<
  PromoCampaign,
  | "id"
  | "name"
  | "promoCode"
  | "discount"
  | "discountMinutes"
  | "startDate"
  | "endDate"
  | "usageLimit"
  | "totalTimesUsed"
  | "partnerName"
  | "status"
  | "target"
  | "duration"
  | "application"
>;

export type TConstructPromoCampaignDto = IPersonalPromoCampaign | ICorporatePromoCampaign;

/**
 ** Query types
 */

export const GetSpecialPromoCampaignsQuery = {
  select: {
    id: true,
    promoCode: true,
    conditionsUrl: true,
    banner: { mobileBannerUrl: true, tabletBannerUrl: true, webBannerUrl: true },
  } as const satisfies FindOptionsSelect<PromoCampaign>,
  relations: { banner: true } as const satisfies FindOptionsRelations<PromoCampaign>,
};
export type TGetSpecialPromoCampaigns = QueryResultType<PromoCampaign, typeof GetSpecialPromoCampaignsQuery.select>;

export const GetPromoCampaignByIdQuery = {
  select: {
    id: true,
    name: true,
    promoCode: true,
    discount: true,
    discountMinutes: true,
    startDate: true,
    endDate: true,
    usageLimit: true,
    totalTimesUsed: true,
    partnerName: true,
    status: true,
    target: true,
    duration: true,
    application: true,
    communicationTypes: true,
    schedulingTypes: true,
    topics: true,
    interpreterTypes: true,
    interpretingTypes: true,
    bannerDisplay: true,
    conditionsUrl: true,
    banner: { id: true, mobileBannerUrl: true, tabletBannerUrl: true, webBannerUrl: true },
  } as const satisfies FindOptionsSelect<PromoCampaign>,
  relations: { banner: true } as const satisfies FindOptionsRelations<PromoCampaign>,
};
export type TGetPromoCampaignById = QueryResultType<PromoCampaign, typeof GetPromoCampaignByIdQuery.select>;

export const CreateCorporatePromoCampaignQuery = {
  select: { id: true, companyType: true } as const satisfies FindOptionsSelect<Company>,
};
export type TCreateCorporatePromoCampaign = QueryResultType<Company, typeof CreateCorporatePromoCampaignQuery.select>;

export const UpdatePromoCampaignQuery = {
  select: {
    id: true,
    name: true,
    promoCode: true,
    discount: true,
    application: true,
    communicationTypes: true,
    schedulingTypes: true,
    topics: true,
    interpreterTypes: true,
    interpretingTypes: true,
    discountMinutes: true,
    usageLimit: true,
    partnerName: true,
    target: true,
    status: true,
    startDate: true,
    endDate: true,
    banner: { id: true },
    bannerDisplay: true,
    conditionsUrl: true,
  } as const satisfies FindOptionsSelect<PromoCampaign>,
  relations: { banner: true } as const satisfies FindOptionsRelations<PromoCampaign>,
};
export type TUpdatePromoCampaign = QueryResultType<PromoCampaign, typeof UpdatePromoCampaignQuery.select>;

export const RemoveOldPromoCampaignsQuery = {
  select: {
    id: true,
    banner: { id: true, mobileBannerUrl: true, tabletBannerUrl: true, webBannerUrl: true },
  } as const satisfies FindOptionsSelect<PromoCampaign>,
  relations: { banner: true } as const satisfies FindOptionsRelations<PromoCampaign>,
};
export type TRemoveOldPromoCampaigns = QueryResultType<PromoCampaign, typeof RemoveOldPromoCampaignsQuery.select>;
