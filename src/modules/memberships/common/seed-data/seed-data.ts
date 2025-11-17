import { ConfigService } from "@nestjs/config";
import { EMembershipPricingRegion, EMembershipStatus, EMembershipType } from "src/modules/memberships/common/enums";
import { ICreateMembership } from "src/modules/memberships/common/interfaces";
import { IStripeSdkData } from "src/modules/stripe/common/interfaces";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { formatDecimalString } from "src/common/utils";

export const membershipsSeedData = (configService: ConfigService): ICreateMembership[] => {
  const {
    priceIdBronzeGlobal,
    priceIdBronzeAu,
    priceIdSilverGlobal,
    priceIdSilverAu,
    priceIdGoldGlobal,
    priceIdGoldAu,
  } = configService.getOrThrow<IStripeSdkData>("stripe");

  return [
    {
      type: EMembershipType.BRONZE,
      status: EMembershipStatus.ACTIVE,
      discount: 5,
      onDemandMinutes: 15,
      preBookedMinutes: 15,
      isMostPopular: false,
      membershipPrices: [
        {
          region: EMembershipPricingRegion.GLOBAL,
          price: formatDecimalString(1),
          gstRate: null,
          currency: EPaymentCurrency.USD,
          stripePriceId: priceIdBronzeGlobal,
        },
        {
          region: EMembershipPricingRegion.AU,
          price: formatDecimalString(1),
          gstRate: null,
          currency: EPaymentCurrency.AUD,
          stripePriceId: priceIdBronzeAu,
        },
      ],
    },
    {
      type: EMembershipType.SILVER,
      status: EMembershipStatus.ACTIVE,
      discount: 10,
      onDemandMinutes: 15,
      preBookedMinutes: 45,
      isMostPopular: true,
      membershipPrices: [
        {
          region: EMembershipPricingRegion.GLOBAL,
          price: formatDecimalString(1),
          gstRate: null,
          currency: EPaymentCurrency.USD,
          stripePriceId: priceIdSilverGlobal,
        },
        {
          region: EMembershipPricingRegion.AU,
          price: formatDecimalString(1),
          gstRate: null,
          currency: EPaymentCurrency.AUD,
          stripePriceId: priceIdSilverAu,
        },
      ],
    },
    {
      type: EMembershipType.GOLD,
      status: EMembershipStatus.ACTIVE,
      discount: 15,
      onDemandMinutes: 30,
      preBookedMinutes: 60,
      isMostPopular: false,
      membershipPrices: [
        {
          region: EMembershipPricingRegion.GLOBAL,
          price: formatDecimalString(1),
          gstRate: null,
          currency: EPaymentCurrency.USD,
          stripePriceId: priceIdGoldGlobal,
        },
        {
          region: EMembershipPricingRegion.AU,
          price: formatDecimalString(1),
          gstRate: null,
          currency: EPaymentCurrency.AUD,
          stripePriceId: priceIdGoldAu,
        },
      ],
    },
  ];
};
