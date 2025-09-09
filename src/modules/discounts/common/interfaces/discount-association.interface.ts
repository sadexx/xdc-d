import { EMembershipType } from "src/modules/memberships/common/enums";
import { TCreateOrUpdateDiscountAssociationAppointment } from "src/modules/discounts/common/types";

export interface IDiscountAssociation {
  promoCampaignDiscount: number | null;
  membershipDiscount: number | null;
  promoCampaignDiscountMinutes: number | null;
  membershipFreeMinutes: number | null;
  promoCode: string | null;
  membershipType: EMembershipType | null;
  appointment?: TCreateOrUpdateDiscountAssociationAppointment;
}
