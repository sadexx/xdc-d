import { Exclude } from "class-transformer";
import { Address } from "src/modules/addresses/entities";
import { AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { ERepeatInterval } from "src/modules/appointment-orders/appointment-order/common/enum";
import { EUserGender } from "src/modules/users/common/enums";

@Entity({ name: "appointment_orders" })
export class AppointmentOrder {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointment_orders_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    unique: true,
  })
  platformId: string;

  @OneToOne(() => Appointment, (appointment) => appointment.appointmentOrder, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointment_orders_appointments_FK",
  })
  appointment: Appointment;

  @Exclude()
  @Column({ type: "uuid", name: "appointment_order_group_id", nullable: true })
  @RelationId((appointment: AppointmentOrder) => appointment.appointmentOrderGroup)
  appointmentOrderGroupId: string | null;

  @ManyToOne(() => AppointmentOrderGroup, (appointmentGroup) => appointmentGroup.appointmentOrders, { nullable: true })
  @JoinColumn({
    name: "appointment_order_group_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointment_orders_appointment_order_groups_FK",
  })
  appointmentOrderGroup: AppointmentOrderGroup | null;

  @Column({ type: "boolean", name: "is_order_group" })
  isOrderGroup: boolean;

  @Column({ type: "uuid", name: "matched_interpreter_ids", array: true, default: [] })
  matchedInterpreterIds: string[];

  @Column({ type: "uuid", name: "rejected_interpreter_ids", array: true, default: [] })
  rejectedInterpreterIds: string[];

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

  @Column({ type: "varchar", name: "client_platform_id" })
  clientPlatformId: string;

  @Column({ type: "varchar", name: "client_first_name" })
  clientFirstName: string;

  @Column({ type: "varchar", name: "client_preferred_name", nullable: true })
  clientPreferredName: string | null;

  @Column({ type: "varchar", name: "client_last_name" })
  clientLastName: string;

  @Column({ type: "timestamptz", name: "next_repeat_time", nullable: true })
  nextRepeatTime: Date | null;

  @Column({
    type: "enum",
    enum: ERepeatInterval,
    name: "repeat_interval",
    nullable: true,
  })
  repeatInterval: ERepeatInterval | null;

  @Column({ type: "int", name: "remaining_repeats", nullable: true })
  remainingRepeats: number | null;

  @Column({ type: "timestamptz", name: "notify_admin", nullable: true })
  notifyAdmin: Date | null;

  @Column({ type: "timestamptz", name: "end_search_time", nullable: true })
  endSearchTime: Date | null;

  @Column({
    type: "enum",
    enum: EAppointmentParticipantType,
    name: "participant_type",
  })
  participantType: EAppointmentParticipantType;

  @Column({ type: "varchar", name: "operated_by_company_name" })
  operatedByCompanyName: string;

  @Column({ type: "uuid", name: "operated_by_company_id" })
  operatedByCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_main_corporate_company_name", nullable: true })
  operatedByMainCorporateCompanyName: string | null;

  @Column({ type: "uuid", name: "operated_by_main_corporate_company_id", nullable: true })
  operatedByMainCorporateCompanyId: string | null;

  @Column({ type: "timestamptz", name: "time_to_restart", nullable: true })
  timeToRestart: Date | null;

  @Column({ type: "boolean", name: "is_first_search_completed", nullable: true })
  isFirstSearchCompleted: boolean | null;

  @Column({ type: "boolean", name: "is_second_search_completed", nullable: true })
  isSecondSearchCompleted: boolean | null;

  @Column({ type: "boolean", name: "is_search_needed", nullable: true })
  isSearchNeeded: boolean | null;

  @Column({ type: "boolean", name: "is_company_has_interpreters", nullable: true })
  isCompanyHasInterpreters: boolean | null;

  @Column({ type: "boolean", name: "accept_overtime_rates", nullable: true })
  acceptOvertimeRates: boolean | null;

  @Column({ type: "varchar", name: "timezone", nullable: true })
  timezone: string | null;

  @Column({ type: "jsonb", name: "address", nullable: true })
  address: Address | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
