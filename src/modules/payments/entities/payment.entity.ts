import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments/common/enums/core";
import { PaymentItem } from "src/modules/payments/entities";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "payments_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_amount" })
  totalAmount: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_gst_amount" })
  totalGstAmount: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_full_amount" })
  totalFullAmount: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "estimated_cost_amount", default: 0 })
  estimatedCostAmount: string;

  @Column({ type: "enum", name: "currency", enum: EPaymentCurrency })
  currency: EPaymentCurrency;

  @Column({ type: "enum", name: "direction", enum: EPaymentDirection })
  direction: EPaymentDirection;

  @Column({ type: "enum", name: "customer_type", enum: EPaymentCustomerType })
  customerType: EPaymentCustomerType;

  @Column({ type: "enum", name: "system", enum: EPaymentSystem })
  system: EPaymentSystem;

  @Column({ type: "boolean", name: "is_deposit_charge", default: false })
  isDepositCharge: boolean;

  @Column({ type: "varchar", name: "payment_method_info" })
  paymentMethodInfo: string;

  @Column({ type: "uuid", name: "membership_id", nullable: true })
  membershipId: string | null;

  @Column({ type: "varchar", name: "receipt", nullable: true })
  receipt: string | null;

  @Column({ type: "varchar", name: "tax_invoice", nullable: true })
  taxInvoice: string | null;

  @Column({ type: "varchar", name: "note", nullable: true })
  note: string | null;

  @Column({
    type: "enum",
    enum: EStripeInterpreterPayOutType,
    name: "stripe_interpreter_payout_type",
    nullable: true,
  })
  stripeInterpreterPayoutType: EStripeInterpreterPayOutType | null;

  @OneToMany(() => PaymentItem, (paymentItem) => paymentItem.payment)
  items: PaymentItem[];

  @ManyToOne(() => UserRole, (client) => client.clientPayIns, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "from_client_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_clients_FK",
  })
  fromClient: UserRole | null;

  @ManyToOne(() => UserRole, (interpreter) => interpreter.interpreterPayOuts, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "to_interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_interpreters_FK",
  })
  toInterpreter: UserRole | null;

  @ManyToOne(() => Company, (company) => company.payments, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_companies_FK",
  })
  company: Company | null;

  @ManyToOne(() => Appointment, (appointment) => appointment.payments, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_appointments_FK",
  })
  appointment: Appointment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
