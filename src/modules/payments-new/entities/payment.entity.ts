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
} from "src/modules/payments-new/common/enums";
import { PaymentItem } from "src/modules/payments-new/entities";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "payments_PK_new" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_amount" })
  totalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_gst_amount" })
  totalGstAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_full_amount" })
  totalFullAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "estimated_cost_amount" })
  estimatedCostAmount: number;

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

  @ManyToOne(() => UserRole, (client) => client.clientPayInsNEW, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "from_client_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_clients_FK_new",
  })
  fromClient: UserRole | null;

  @ManyToOne(() => UserRole, (interpreter) => interpreter.interpreterPayOutsNEW, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "to_interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_interpreters_FK_new",
  })
  toInterpreter: UserRole | null;

  @ManyToOne(() => Company, (company) => company.paymentsNEW, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_companies_FK_new",
  })
  company: Company | null;

  @ManyToOne(() => Appointment, (appointment) => appointment.paymentsNEW, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_appointments_FK_new",
  })
  appointment: Appointment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
