import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";
import { OldECurrencies } from "src/modules/payments/common/enums";

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
  price: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "gst_amount", nullable: true })
  gstAmount: number | null;

  @Column({
    type: "enum",
    enum: OldECurrencies,
    name: "currency",
  })
  currency: OldECurrencies;

  @ManyToOne(() => Membership, (membership) => membership.membershipPrices, { nullable: false, onDelete: "CASCADE" })
  membership: Membership;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
