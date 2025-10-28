import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import {
  OldEPaymentDirection,
  OldEStripeInterpreterPayoutType,
  OldECustomerType,
} from "src/modules/payments/common/enums";
import { OldECurrencies } from "src/modules/payments/common/enums/old-currencies.enum";
import { OldPaymentItem } from "src/modules/payments/entities/old-payment-item.entity";
import { EPaymentSystem } from "src/modules/payments-new/common/enums";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { ESequenceName } from "src/common/enums";
import { setPlatformId } from "src/common/utils";

@Entity("payments")
export class OldPayment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "payments_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string | null;

  @Column({ type: "enum", name: "direction", enum: OldEPaymentDirection, nullable: false })
  direction: OldEPaymentDirection;

  @Column({ type: "enum", name: "customer_type", enum: OldECustomerType, nullable: true })
  customerType: OldECustomerType | null;

  @ManyToOne(() => UserRole, (client) => client.clientPayIns, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "from_client_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_clients_FK",
  })
  fromClient: UserRole | null;

  @Column({ type: "uuid", name: "from_client_id", nullable: true })
  @RelationId((payment: OldPayment) => payment.fromClient)
  fromClientId: string | null;

  @ManyToOne(() => UserRole, (interpreter) => interpreter.interpreterPayOuts, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "to_interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_interpreters_FK",
  })
  toInterpreter: UserRole | null;

  @Column({ type: "uuid", name: "to_interpreter_id", nullable: true })
  @RelationId((payment: OldPayment) => payment.toInterpreter)
  toInterpreterId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_amount", nullable: false })
  totalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_gst_amount", nullable: false })
  totalGstAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "total_full_amount", nullable: false })
  totalFullAmount: number;

  @Column({ type: "enum", enum: OldECurrencies, name: "currency", nullable: false })
  currency: OldECurrencies;

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

  @Column({ type: "uuid", name: "membership_id", nullable: true })
  membershipId: string | null;

  @Column({ type: "enum", enum: EPaymentSystem, name: "system", nullable: false })
  system: EPaymentSystem;

  @Column({
    type: "enum",
    enum: OldEStripeInterpreterPayoutType,
    name: "stripe_interpreter_payout_type",
    nullable: true,
  })
  stripeInterpreterPayoutType: OldEStripeInterpreterPayoutType | null;

  @Column({ type: "varchar", name: "payment_method_info", nullable: true })
  paymentMethodInfo: string | null;

  @Column({ type: "varchar", name: "receipt", nullable: true })
  receipt: string | null;

  @Column({ type: "varchar", name: "tax_invoice", nullable: true })
  taxInvoice: string | null;

  @Column({ type: "varchar", name: "note", nullable: true })
  note: string | null;

  @OneToMany(() => OldPaymentItem, (paymentItem) => paymentItem.payment)
  items: OldPaymentItem[];

  @ManyToOne(() => Company, (company) => company.payments, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_companies_FK",
  })
  company: Company | null;

  @Column({ type: "uuid", name: "company_id", nullable: true })
  @RelationId((payment: OldPayment) => payment.company)
  companyId: string | null;

  @Column({ type: "boolean", name: "is_deposit_charge", default: false })
  isDepositCharge: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeUpdate()
  @BeforeInsert()
  async setPlatformId(): Promise<void> {
    if ((this.isDepositCharge || this.membershipId) && !this.platformId) {
      this.platformId = await setPlatformId(ESequenceName.PAYMENT);
    }
  }
}
