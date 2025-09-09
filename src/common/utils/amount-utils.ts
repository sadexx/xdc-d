import { ONE_HUNDRED } from "src/common/constants";

export function denormalizedAmountToNormalized(denormalizedAmount: number): number {
  return Number((denormalizedAmount * ONE_HUNDRED).toFixed(0));
}

export function normalizedAmountToDenormalized(normalizedAmount: number): number {
  return normalizedAmount / ONE_HUNDRED;
}
