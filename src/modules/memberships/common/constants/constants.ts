import { EExtCountry } from "src/modules/addresses/common/enums";
import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";

export const membershipRegionPricingMap: Partial<Record<EExtCountry, EMembershipPricingRegion>> = {
  [EExtCountry.AUSTRALIA]: EMembershipPricingRegion.AU,
};
