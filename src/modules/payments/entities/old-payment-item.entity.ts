import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { OldEPaymentStatus } from "src/modules/payments/common/enums";
import { OldECurrencies } from "src/modules/payments/common/enums/old-currencies.enum";
import { OldPayment } from "src/modules/payments/entities/old-payment.entity";
import { EMembershipType } from "src/modules/memberships/common/enums";

@Entity("payment_items")
export class OldPaymentItem {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "payment_items_PK" })
  id: string;

  @ManyToOne(() => OldPayment, (payment) => payment.items, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "payment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payment_items_payments_FK",
  })
  payment: OldPayment;

  @Column({ type: "uuid", name: "payment_id", nullable: false })
  @RelationId((paymentItem: OldPaymentItem) => paymentItem.payment)
  paymentId: string;

  @Column({ type: "varchar", name: "external_id", nullable: true })
  externalId: string | null;

  @Column({ type: "varchar", name: "transfer_id", nullable: true })
  transferId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "amount", nullable: false })
  amount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "gst_amount", nullable: false })
  gstAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "full_amount", nullable: false })
  fullAmount: number;

  @Column({ type: "enum", enum: OldECurrencies, name: "currency", nullable: false })
  currency: OldECurrencies;

  @Column({ type: "enum", enum: OldEPaymentStatus, name: "status", nullable: false })
  status: OldEPaymentStatus;

  @Column({ type: "varchar", name: "receipt", nullable: true })
  receipt: string | null;

  @Column({ type: "varchar", name: "note", nullable: true })
  note: string | null;

  @Column({ type: "int", name: "applied_promo_discounts_percent", nullable: true })
  appliedPromoDiscountsPercent: number | null;

  @Column({ type: "int", name: "applied_membership_discounts_percent", nullable: true })
  appliedMembershipDiscountsPercent: number | null;

  @Column({ type: "int", name: "applied_promo_discounts_minutes", nullable: true })
  appliedPromoDiscountsMinutes: number | null;

  @Column({ type: "int", name: "applied_membership_free_minutes", nullable: true })
  appliedMembershipFreeMinutes: number | null;

  @Column({ type: "varchar", name: "applied_promo_code", nullable: true })
  appliedPromoCode: string | null;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "applied_membership_type",
    nullable: true,
  })
  appliedMembershipType: EMembershipType | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_membership_minutes",
    nullable: true,
  })
  amountOfAppliedDiscountByMembershipMinutes: number | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_membership_discount",
    nullable: true,
  })
  amountOfAppliedDiscountByMembershipDiscount: number | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_promo_code",
    nullable: true,
  })
  amountOfAppliedDiscountByPromoCode: number | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
