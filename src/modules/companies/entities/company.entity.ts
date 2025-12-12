import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import {
  ECompanyActivitySphere,
  ECompanyEmployeesNumber,
  ECompanyFundingSource,
  ECompanyStatus,
  ECompanySubStatus,
  ECompanyType,
} from "src/modules/companies/common/enums";
import { User } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { AbnCheck } from "src/modules/abn/entities";
import { CompanyDocument } from "src/modules/companies/entities";
import { CorporateContractSigners, DocusignContract } from "src/modules/docusign/entities";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";
import { DiscountHolder } from "src/modules/discounts/entities/discount-holder.entity";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Payment } from "src/modules/payments/entities";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "companies_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    unique: true,
  })
  platformId: string;

  @Column({ type: "varchar", name: "name" })
  name: string;

  @Column({ type: "varchar", name: "phone_number" })
  phoneNumber: string;

  @Column({ type: "varchar", name: "contact_person" })
  contactPerson: string;

  @Column({ type: "varchar", name: "contact_email" })
  contactEmail: string;

  @Column({ type: "enum", enum: EExtCountry, name: "country" })
  country: EExtCountry;

  @Column({
    type: "enum",
    enum: ECompanyActivitySphere,
    name: "activity_sphere",
    nullable: true,
  })
  activitySphere: ECompanyActivitySphere | null;

  @Column({
    type: "enum",
    enum: ECompanyEmployeesNumber,
    name: "employees_number",
  })
  employeesNumber: ECompanyEmployeesNumber;

  @Column({
    type: "enum",
    enum: ECompanyFundingSource,
    name: "funding_source",
    nullable: true,
  })
  fundingSource: ECompanyFundingSource | null;

  @Column({ type: "enum", enum: ECompanyStatus, default: ECompanyStatus.NEW_REQUEST, name: "status" })
  status: ECompanyStatus;

  @Column({ type: "enum", enum: ECompanySubStatus, name: "sub_status", nullable: true })
  subStatus: ECompanySubStatus | null;

  @Column({
    type: "enum",
    enum: ECompanyType,
    name: "company_type",
  })
  companyType: ECompanyType;

  @Column({ type: "varchar", name: "admin_name", nullable: true })
  adminName: string | null;

  @Column({ type: "varchar", name: "admin_email", nullable: true })
  adminEmail: string | null;

  @Column({ type: "timestamptz", name: "invitation_link_creation_date", nullable: true })
  invitationLinkCreationDate: Date | null;

  @Column({ type: "varchar", name: "operated_by_main_company_id" })
  operatedByMainCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_main_company_name" })
  operatedByMainCompanyName: string;

  @Column({ type: "varchar", name: "operated_by_main_company_platform_id" })
  operatedByMainCompanyPlatformId: string;

  @Column({ type: "varchar", name: "business_registration_number", nullable: true })
  businessRegistrationNumber: string | null;

  @Column({ type: "varchar", name: "abn_number", nullable: true })
  abnNumber: string | null;

  @OneToOne(() => User, (user) => user.administratedCompany, { nullable: true, cascade: ["insert", "remove"] })
  @JoinColumn({
    name: "super_admin_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "companies_super_admins_FK",
  })
  superAdmin: User | null;

  @Column({ type: "uuid", name: "super_admin_id", nullable: true })
  @RelationId((company: Company) => company.superAdmin)
  superAdminId: string | null;

  @OneToOne(() => AbnCheck, (abnCheck) => abnCheck.company, { nullable: true })
  abnCheck: AbnCheck | null;

  @OneToOne(() => Address, (address) => address.company, { onDelete: "CASCADE" })
  address: Address;

  @OneToMany(() => CompanyDocument, (document) => document.company)
  documents: CompanyDocument[];

  @OneToOne(() => CorporateContractSigners, (corporateContractSigners) => corporateContractSigners.company, {
    nullable: true,
  })
  contractSigners: CorporateContractSigners | null;

  @OneToOne(() => DocusignContract, (docusignContract) => docusignContract.company, {
    nullable: true,
  })
  contract: DocusignContract | null;

  @OneToOne(() => DiscountHolder, (discountHolder) => discountHolder.company, { nullable: true })
  discountHolder: DiscountHolder | null;

  @OneToOne(() => PaymentInformation, (paymentInformation) => paymentInformation.company, { nullable: true })
  paymentInformation: PaymentInformation | null;

  @OneToMany(() => Payment, (payment) => payment.company)
  payments: Payment[];

  @OneToOne(() => CompanyDepositCharge, (companyDepositCharge) => companyDepositCharge.company, {
    nullable: true,
    onDelete: "CASCADE",
  })
  depositCharge: CompanyDepositCharge | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "deposit_amount", nullable: true })
  depositAmount: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "deposit_default_charge_amount", nullable: true })
  depositDefaultChargeAmount: string | null;

  @Column({ type: "integer", name: "platform_commission_rate", nullable: true })
  platformCommissionRate: number | null;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive: boolean;

  @Column({ type: "timestamptz", name: "last_deactivation_date", nullable: true })
  lastDeactivationDate: Date | null;

  @Column({ name: "remove_all_admin_roles", type: "boolean", nullable: true })
  removeAllAdminRoles: boolean | null;

  @Column({ name: "is_in_delete_waiting", type: "boolean", default: false })
  isInDeleteWaiting: boolean;

  @Column({ type: "timestamptz", name: "deleting_date", nullable: true })
  deletingDate: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    const platformId = await setPlatformId(ESequenceName.CUSTOMER);
    this.platformId = platformId;

    if (this.id === COMPANY_LFH_ID) {
      this.operatedByMainCompanyPlatformId = platformId;
    }
  }
}
