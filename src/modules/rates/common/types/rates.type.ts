import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  RateFlatCollection,
  RateStandardCollection,
  SelectedFlatRatePrices,
  SelectedStandardPrices,
} from "src/modules/rates/common/interfaces";

export type TimeString = `${string}:${string}:${string}`;
export type TRateTiming =
  | `up-to-the-first-${number}-minutes`
  | `up-to-${number}-minutes-each-additional-block`
  | `calculated-per-day-${number}-hours`;
export type TRateCollection = RateStandardCollection | RateFlatCollection;
export type TSelectedPrices = SelectedStandardPrices | SelectedFlatRatePrices;
export type TExtractPrices = { client: number; interpreter: number };
export type TTimeBoundary = "client-time-boundary" | "dual-time-boundary";
export type TBlockType = "first" | "additional";
export type TScenarioPeakNormal = "normal" | "peak";
export type TTargetRolePricing = "client" | "interpreter";
export type TDiscountName =
  | "Membership Free Minutes"
  | "Promo Campaign Minutes Discount"
  | "Promo Campaign Percentage Discount"
  | "Membership Discount";

export type TDiscountAppliedMessage =
  | "Membership Free Minutes (100%)"
  | `Membership Free Minutes (${number}min)`
  | `${TDiscountName} (${number}%)`
  | `${TDiscountName} (${number}min at ${number}%)`;
export type TStepName =
  | "Step 0 - Calculation Config"
  | "Step 1 - Rates Retrieved"
  | "Step 2 - Time Boundary Analysis"
  | "Step 3 - Base Block Creation"
  | "Step 4 - Price Field Selection"
  | "Step 5 - Base Price Calculation"
  | "Step 6 - Apply Membership Free Minutes"
  | "Step 7 - Apply Promo Campaign Discounts"
  | "Step 8 - Apply Membership Discount";

export type TAppointmentCalculation = Pick<
  Appointment,
  | "id"
  | "platformId"
  | "schedulingDurationMin"
  | "topic"
  | "communicationType"
  | "schedulingType"
  | "interpreterType"
  | "interpretingType"
  | "acceptOvertimeRates"
  | "timezone"
> & {
  businessStartTime: string;
  businessEndTime: string;
  scheduledStartTime: string;
  interpreterTimezone: string;
};
