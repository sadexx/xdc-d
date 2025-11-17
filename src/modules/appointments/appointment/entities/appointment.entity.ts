import { Exclude } from "class-transformer";
import { ESequenceName } from "src/common/enums";
import { setPlatformId } from "src/common/utils";
import { Address } from "src/modules/addresses/entities";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import {
  AppointmentAdminInfo,
  AppointmentExternalSession,
  AppointmentRating,
  AppointmentReminder,
} from "src/modules/appointments/appointment/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users/entities";
import { EUserGender } from "src/modules/users/common/enums";
import {
  BeforeInsert,
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
import { DiscountAssociation } from "src/modules/discounts/entities";
import { Blacklist } from "src/modules/blacklists/entities";
import { ShortUrl } from "src/modules/url-shortener/entities";
import { IncomingPaymentWaitList, Payment } from "src/modules/payments/entities";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

@Entity({ name: "appointments" })
export class Appointment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointments_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    unique: true,
  })
  platformId: string;

  /**
   *? Individual Client
   */

  @Exclude()
  @Column({ type: "uuid", name: "client_id", nullable: true })
  @RelationId((appointment: Appointment) => appointment.client)
  clientId: string | null;

  @ManyToOne(() => UserRole, (client) => client.clientAppointments, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "client_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointments_clients_FK",
  })
  client: UserRole | null;

  @Column({ type: "boolean", name: "archived_by_client", default: false })
  archivedByClient: boolean;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "paid_by_client", default: 0 })
  paidByClient: string;

  @Column({
    type: "enum",
    enum: EPaymentCurrency,
    name: "client_currency",
    nullable: true,
  })
  clientCurrency: EPaymentCurrency | null;

  /**
   *? Interpreter: Individual, Language Buddy
   */

  @Exclude()
  @Column({ type: "uuid", name: "interpreter_id", nullable: true })
  @RelationId((appointment: Appointment) => appointment.interpreter)
  interpreterId: string | null;

  @ManyToOne(() => UserRole, (interpreter) => interpreter.interpreterAppointments, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointments_interpreters_FK",
  })
  interpreter: UserRole | null;

  @Column({ type: "boolean", name: "archived_by_interpreter", default: false })
  archivedByInterpreter: boolean;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "received_by_interpreter", default: 0 })
  receivedByInterpreter: string;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "received_by_interpreter_gst", default: 0 })
  receivedByInterpreterGst: string;

  @Column({
    type: "enum",
    enum: EPaymentCurrency,
    name: "interpreter_currency",
    nullable: true,
  })
  interpreterCurrency: EPaymentCurrency | null;

  /**
   *? Relations Fields
   */

  @OneToOne(() => AppointmentOrder, (appointmentOrder) => appointmentOrder.appointment, { nullable: true })
  appointmentOrder: AppointmentOrder | null;

  @OneToOne(() => ChimeMeetingConfiguration, (chimeMeetingConfiguration) => chimeMeetingConfiguration.appointment, {
    nullable: true,
  })
  chimeMeetingConfiguration: ChimeMeetingConfiguration | null;

  @OneToMany(() => MultiWayParticipant, (participant) => participant.appointment)
  participants: MultiWayParticipant[];

  @OneToOne(() => Address, (address) => address.appointment, { nullable: true })
  address: Address | null;

  @OneToOne(() => AppointmentExternalSession, (appointmentExternalSession) => appointmentExternalSession.appointment, {
    nullable: true,
  })
  appointmentExternalSession: AppointmentExternalSession | null;

  @OneToOne(() => AppointmentAdminInfo, (appointmentAdminInfo) => appointmentAdminInfo.appointment, {
    nullable: true,
  })
  appointmentAdminInfo: AppointmentAdminInfo | null;

  @OneToOne(() => AppointmentReminder, (appointmentReminder) => appointmentReminder.appointment, {
    cascade: ["insert"],
    nullable: true,
  })
  appointmentReminder: AppointmentReminder | null;

  @OneToOne(() => AppointmentRating, (appointmentRating) => appointmentRating.appointment, {
    nullable: true,
  })
  appointmentRating: AppointmentRating | null;

  @OneToOne(() => DiscountAssociation, (discountAssociation) => discountAssociation.appointment, { nullable: true })
  discountAssociation: DiscountAssociation | null;

  @OneToMany(() => Blacklist, (blacklist) => blacklist.appointment)
  blacklists: Blacklist[];

  @OneToOne(() => IncomingPaymentWaitList, (incomingPaymentsWaitList) => incomingPaymentsWaitList.appointment, {
    nullable: true,
  })
  incomingPaymentsWaitList: IncomingPaymentWaitList | null;

  @OneToMany(() => Payment, (payment) => payment.appointment)
  payments: Payment[];

  @OneToMany(() => ShortUrl, (shortUrl) => shortUrl.appointment)
  shortUrls: ShortUrl[];

  /**
   ** Public Fields
   */

  @Column({ type: "timestamptz", name: "scheduled_start_time" })
  scheduledStartTime: Date;

  @Column({ type: "timestamptz", name: "scheduled_end_time" })
  scheduledEndTime: Date;

  @Column({
    type: "enum",
    enum: EAppointmentCommunicationType,
    name: "communication_type",
  })
  communicationType: EAppointmentCommunicationType;

  @Column({
    type: "enum",
    enum: EAppointmentSchedulingType,
    name: "scheduling_type",
  })
  schedulingType: EAppointmentSchedulingType;

  @Column({ type: "integer", name: "scheduling_duration" })
  schedulingDurationMin: number;

  @Column({
    type: "enum",
    enum: EAppointmentTopic,
    name: "topic",
  })
  topic: EAppointmentTopic;

  @Column({
    type: "enum",
    enum: EUserGender,
    name: "preferred_interpreter_gender",
    nullable: true,
  })
  preferredInterpreterGender: EUserGender | null;

  @Column({
    type: "enum",
    enum: EAppointmentInterpreterType,
    name: "interpreter_type",
  })
  interpreterType: EAppointmentInterpreterType;

  @Column({
    type: "enum",
    enum: EAppointmentInterpretingType,
    name: "interpreting_type",
  })
  interpretingType: EAppointmentInterpretingType;

  @Column({
    type: "enum",
    enum: EAppointmentSimultaneousInterpretingType,
    name: "simultaneous_interpreting_type",
    nullable: true,
  })
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType | null;

  @Column({
    type: "enum",
    enum: ELanguages,
    name: "language_from",
  })
  languageFrom: ELanguages;

  @Column({
    type: "enum",
    enum: ELanguages,
    name: "language_to",
  })
  languageTo: ELanguages;

  @Column({
    type: "enum",
    enum: EAppointmentParticipantType,
    name: "participant_type",
  })
  participantType: EAppointmentParticipantType;

  @Column({ type: "boolean", name: "alternative_platform", default: false })
  alternativePlatform: boolean;

  @Column({
    type: "varchar",
    name: "alternative_video_conferencing_platform_link",
    nullable: true,
  })
  alternativeVideoConferencingPlatformLink: string | null;

  @Column({ type: "text", name: "notes", nullable: true })
  notes: string | null;

  @Column({ type: "boolean", name: "scheduling_extra_day" })
  schedulingExtraDay: boolean;

  @Column({
    type: "enum",
    enum: EAppointmentStatus,
    name: "status",
    default: EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION,
  })
  status: EAppointmentStatus;

  @Column({ type: "timestamptz", name: "business_start_time", nullable: true })
  businessStartTime: Date | null;

  @Column({ type: "timestamptz", name: "business_end_time", nullable: true })
  businessEndTime: Date | null;

  @Column({ type: "timestamptz", name: "client_last_active_time", nullable: true })
  clientLastActiveTime: Date | null;

  @Column({ type: "timestamptz", name: "internal_estimated_end_time" })
  internalEstimatedEndTime: Date;

  @Column({ type: "boolean", name: "is_group_appointment", default: false })
  isGroupAppointment: boolean;

  @Column({ type: "varchar", name: "appointments_group_id", nullable: true })
  appointmentsGroupId: string | null;

  @Column({ type: "boolean", name: "same_interpreter", default: false })
  sameInterpreter: boolean;

  @Column({ type: "uuid", name: "channel_id", nullable: true })
  channelId: string | null;

  @Column({ type: "varchar", name: "operated_by_company_name" })
  operatedByCompanyName: string;

  @Column({ type: "uuid", name: "operated_by_company_id" })
  operatedByCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_main_corporate_company_name", nullable: true })
  operatedByMainCorporateCompanyName: string | null;

  @Column({ type: "uuid", name: "operated_by_main_corporate_company_id", nullable: true })
  operatedByMainCorporateCompanyId: string | null;

  @Column({ type: "boolean", name: "accept_overtime_rates" })
  acceptOvertimeRates: boolean;

  @Column({ type: "varchar", name: "timezone" })
  timezone: string;

  @Column({ type: "timestamptz", name: "accepted_date", nullable: true })
  acceptedDate: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    this.platformId = await setPlatformId(ESequenceName.APPOINTMENT);
  }
}
