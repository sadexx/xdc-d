import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Payment } from "src/modules/payments/entities";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments/common/enums/core";

@Entity("payment_items")
export class PaymentItem {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "payment_items_PK" })
  id: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "amount" })
  amount: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "gst_amount" })
  gstAmount: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "full_amount" })
  fullAmount: string;

  @Column({ type: "enum", enum: EPaymentCurrency, name: "currency" })
  currency: EPaymentCurrency;

  @Column({ type: "enum", enum: EPaymentStatus, name: "status" })
  status: EPaymentStatus;

  @Column({ type: "varchar", name: "applied_promo_code", nullable: true })
  appliedPromoCode: string | null;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "applied_membership_type",
    nullable: true,
  })
  appliedMembershipType: EMembershipType | null;

  @Column({ type: "int", name: "applied_promo_discounts_percent", nullable: true })
  appliedPromoDiscountsPercent: number | null;

  @Column({ type: "int", name: "applied_membership_discounts_percent", nullable: true })
  appliedMembershipDiscountsPercent: number | null;

  @Column({ type: "int", name: "applied_promo_discounts_minutes", nullable: true })
  appliedPromoDiscountsMinutes: number | null;

  @Column({ type: "int", name: "applied_membership_free_minutes", nullable: true })
  appliedMembershipFreeMinutes: number | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_promo_code",
    nullable: true,
  })
  amountOfAppliedDiscountByPromoCode: string | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_membership_minutes",
    nullable: true,
  })
  amountOfAppliedDiscountByMembershipMinutes: string | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_membership_discount",
    nullable: true,
  })
  amountOfAppliedDiscountByMembershipDiscount: string | null;

  @Column({ type: "varchar", name: "external_id", nullable: true })
  externalId: string | null;

  @Column({ type: "varchar", name: "transfer_id", nullable: true })
  transferId: string | null;

  @Column({ type: "varchar", name: "receipt", nullable: true })
  receipt: string | null;

  @Column({ type: "varchar", name: "note", nullable: true })
  note: string | null;

  @ManyToOne(() => Payment, (payment) => payment.items, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "payment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payment_items_payments_FK",
  })
  payment: Payment;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
