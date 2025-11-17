import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { Company } from "src/modules/companies/entities";
import { EPaymentSystem } from "src/modules/payments/common/enums/core";

@Entity("payments_information")
export class PaymentInformation {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "payments_information_PK" })
  id: string;

  @Column({ type: "varchar", name: "stripe_client_account_id", nullable: true })
  stripeClientAccountId: string | null;

  @Column({ type: "varchar", name: "stripe_client_payment_method_id", nullable: true })
  stripeClientPaymentMethodId: string | null;

  @Column({ type: "varchar", name: "stripe_client_last_four", nullable: true })
  stripeClientLastFour: string | null;

  @Column({ type: "varchar", name: "stripe_interpreter_account_id", nullable: true })
  stripeInterpreterAccountId: string | null;

  @Column({ type: "enum", enum: EOnboardingStatus, name: "stripe_interpreter_onboarding_status", nullable: true })
  stripeInterpreterOnboardingStatus: EOnboardingStatus | null;

  @Column({ type: "varchar", name: "stripe_interpreter_bank_id", nullable: true })
  stripeInterpreterBankAccountId: string | null;

  @Column({ type: "varchar", name: "stripe_interpreter_bank_account_last4", nullable: true })
  stripeInterpreterBankAccountLast4: string | null;

  @Column({ type: "varchar", name: "stripe_interpreter_bank_name", nullable: true })
  stripeInterpreterBankName: string | null;

  @Column({ type: "varchar", name: "stripe_interpreter_card_id", nullable: true })
  stripeInterpreterCardId: string | null;

  @Column({ type: "varchar", name: "stripe_interpreter_card_last4", nullable: true })
  stripeInterpreterCardLast4: string | null;

  @Column({ type: "varchar", name: "stripe_interpreter_card_brand", nullable: true })
  stripeInterpreterCardBrand: string | null;

  @Column({ type: "varchar", name: "paypal_payer_id", nullable: true })
  paypalPayerId: string | null;

  @Column({ type: "varchar", name: "paypal_email", nullable: true })
  paypalEmail: string | null;

  @Column({ type: "varchar", name: "paypal_account_verified", nullable: true })
  paypalAccountVerified: string | null;

  @Column({ type: "enum", enum: EPaymentSystem, name: "interpreter_system_for_payout", nullable: true })
  interpreterSystemForPayout: EPaymentSystem | null;

  @OneToOne(() => UserRole, (userRole) => userRole.paymentInformation, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({
    name: "users_roles_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_information_user_roles_FK",
  })
  userRole: UserRole | null;

  @OneToOne(() => Company, (company) => company.paymentInformation, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({
    name: "companies_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payments_information_companies_FK",
  })
  company: Company | null;

  @Column({ type: "varchar", name: "note", nullable: true })
  note: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
