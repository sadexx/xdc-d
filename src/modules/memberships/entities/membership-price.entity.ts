import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

@Entity({ name: "membership_prices" })
export class MembershipPrice {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "membership_prices_PK" })
  id: string;

  @Column({ type: "varchar", name: "stripe_price_id" })
  stripePriceId: string;

  @Column({
    type: "enum",
    enum: EMembershipPricingRegion,
    name: "region",
  })
  region: EMembershipPricingRegion;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "price" })
  price: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "gst_amount", nullable: true })
  gstAmount: string | null;

  @Column({
    type: "enum",
    enum: EPaymentCurrency,
    name: "currency",
  })
  currency: EPaymentCurrency;

  @ManyToOne(() => Membership, (membership) => membership.membershipPrices, { nullable: false, onDelete: "CASCADE" })
  membership: Membership;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
