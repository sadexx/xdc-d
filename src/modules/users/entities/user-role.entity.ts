import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "src/modules/users/entities";
import { User, UserDocument, UserProfile } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { AbnCheck } from "src/modules/abn/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { DocusignContract } from "src/modules/docusign/entities";
import { EAccountStatus } from "src/modules/users/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";
import { CustomInsurance, InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { NaatiProfile } from "src/modules/naati/entities";
import { IeltsCheck } from "src/modules/ielts/entities";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { COMPANY_LFH_FULL_NAME, COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Notification } from "src/modules/notifications/entities";
import { InterpreterQuestionnaire } from "src/modules/interpreters/questionnaire/entities";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { DiscountHolder } from "src/modules/discounts/entities/discount-holder.entity";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { Blacklist } from "src/modules/blacklists/entities";
import { Payment } from "src/modules/payments/entities";

@Entity({ name: "user_roles" })
export class UserRole {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "user_roles_PK" })
  id: string;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", referencedColumnName: "id", foreignKeyConstraintName: "user_roles_users_FK" })
  user: User;

  @Column({ type: "uuid", name: "user_id", nullable: false })
  @RelationId((userRole: UserRole) => userRole.user)
  userId: string;

  @ManyToOne(() => Role, (role) => role.userRoles)
  @JoinColumn({ name: "role_id", referencedColumnName: "id", foreignKeyConstraintName: "user_roles_roles_FK" })
  role: Role;

  @Column({ type: "uuid", name: "role_id", nullable: false })
  @RelationId((userRole: UserRole) => userRole.role)
  roleId: string;

  @OneToOne(() => Address, (address) => address.userRole, { nullable: true })
  address: Address | null;

  @OneToOne(() => UserProfile, (userProfile) => userProfile.userRole)
  profile: UserProfile;

  @OneToOne(() => InterpreterProfile, (interpreterProfile) => interpreterProfile.userRole, { nullable: true })
  interpreterProfile: InterpreterProfile | null;

  @OneToOne(() => CustomInsurance, (customInsurance) => customInsurance.userRole, { nullable: true })
  customInsurance: CustomInsurance | null;

  @OneToMany(() => UserDocument, (document) => document.userRole)
  documents: UserDocument[];

  @OneToOne(() => InterpreterQuestionnaire, (questionnaire) => questionnaire.userRole, {
    nullable: true,
  })
  questionnaire: InterpreterQuestionnaire | null;

  @OneToOne(() => SumSubCheck, (sumSub) => sumSub.userRole, { nullable: true })
  sumSubCheck: SumSubCheck | null;

  @OneToOne(() => AbnCheck, (abnCheck) => abnCheck.userRole, { nullable: true })
  abnCheck: AbnCheck | null;

  @OneToOne(() => NaatiProfile, (naatiProfile) => naatiProfile.userRole, { nullable: true })
  naatiProfile: NaatiProfile | null;

  @OneToMany(() => DocusignContract, (contract) => contract.userRole)
  docusignContracts: DocusignContract[];

  @OneToOne(() => IeltsCheck, (ieltsCheck) => ieltsCheck.userRole, { nullable: true })
  ieltsCheck: IeltsCheck | null;

  @OneToOne(() => BackyCheck, (backyCheck) => backyCheck.userRole, { nullable: true })
  backyCheck: BackyCheck | null;

  @OneToOne(() => UserConcessionCard, (userConcessionCard) => userConcessionCard.userRole, { nullable: true })
  userConcessionCard: UserConcessionCard | null;

  @OneToMany(() => LanguageDocCheck, (languageDocCheck) => languageDocCheck.userRole)
  languageDocChecks: LanguageDocCheck[];

  @OneToMany(() => RightToWorkCheck, (rightToWorkCheck) => rightToWorkCheck.userRole)
  rightToWorkChecks: RightToWorkCheck[];

  @OneToMany(() => DraftAppointment, (draftAppointment) => draftAppointment.client)
  clientDraftAppointments: DraftAppointment[];

  @OneToMany(() => Appointment, (appointment) => appointment.client)
  clientAppointments: Appointment[];

  @OneToMany(() => Appointment, (appointment) => appointment.interpreter)
  interpreterAppointments: Appointment[];

  @OneToMany(() => Notification, (notification) => notification.userRole)
  notifications: Notification[];

  @OneToOne(() => PaymentInformation, (paymentInformation) => paymentInformation.userRole, { nullable: true })
  paymentInformation: PaymentInformation | null;

  @OneToOne(() => DiscountHolder, (discountHolder) => discountHolder.userRole, { nullable: true })
  discountHolder: DiscountHolder | null;

  @OneToMany(() => ChannelMembership, (channelMembership) => channelMembership.userRole)
  channelMemberships: ChannelMembership[];

  @OneToMany(() => Blacklist, (blacklist) => blacklist.blockedByUserRole)
  blockedByUserRoles: Blacklist[];

  @OneToMany(() => Blacklist, (blacklist) => blacklist.blockedUserRole)
  blockedUserRoles: Blacklist[];

  @OneToMany(() => Payment, (payment) => payment.fromClient)
  clientPayIns: Payment[];

  @OneToMany(() => Payment, (payment) => payment.toInterpreter)
  interpreterPayOuts: Payment[];

  @Column({ default: false, name: "is_user_agreed_to_terms_and_conditions" })
  isUserAgreedToTermsAndConditions: boolean;

  @Column({ default: false, name: "is_registration_finished" })
  isRegistrationFinished: boolean;

  @Column({ name: "is_required_info_fulfilled", type: "boolean", default: false })
  isRequiredInfoFulfilled: boolean;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive: boolean;

  @Column({
    type: "enum",
    enum: EAccountStatus,
    name: "account_status",
    default: EAccountStatus.START_REGISTRATION,
  })
  accountStatus: EAccountStatus;

  @Column({ type: "uuid", name: "operated_by_company_id", default: COMPANY_LFH_ID })
  operatedByCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_company_name", default: COMPANY_LFH_FULL_NAME })
  operatedByCompanyName: string;

  @Column({ type: "uuid", name: "operated_by_main_corporate_company_id", nullable: true })
  operatedByMainCorporateCompanyId: string | null;

  @Column({ type: "varchar", name: "operated_by_main_corporate_company_name", nullable: true })
  operatedByMainCorporateCompanyName: string | null;

  @Column({ type: "timestamptz", name: "invitation_link_creation_date", nullable: true })
  invitationLinkCreationDate: Date | null;

  @Column({ type: "timestamptz", name: "last_deactivation_date", nullable: true })
  lastDeactivationDate: Date | null;

  @Column({ name: "is_in_delete_waiting", type: "boolean", default: false })
  isInDeleteWaiting: boolean;

  @Column({ type: "timestamptz", name: "deleting_date", nullable: true })
  deletingDate: Date | null;

  @Column({ type: "uuid", name: "restoration_key", nullable: true })
  restorationKey: string | null;

  @Column({ type: "varchar", name: "country", nullable: true })
  country: string | null;

  @Column({ type: "varchar", name: "timezone", nullable: true })
  timezone: string | null;

  @Column({ type: "varchar", name: "instance_user_arn", nullable: true })
  instanceUserArn: string | null;

  @Column({ type: "timestamptz", name: "registration_date", nullable: true })
  registrationDate: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
