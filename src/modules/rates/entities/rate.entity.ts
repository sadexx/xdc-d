import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { TRateTiming, TimeString } from "src/modules/rates/common/types";

@Entity("rates")
export class Rate {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "rates_PK" })
  id: string;

  @Column({ type: "integer", name: "quantity", nullable: false })
  quantity: number;

  @Column({
    type: "enum",
    enum: EAppointmentInterpreterType,
    name: "interpreter_type",
  })
  interpreterType: EAppointmentInterpreterType;

  @Column({
    type: "enum",
    enum: EAppointmentSchedulingType,
    name: "scheduling_type",
  })
  schedulingType: EAppointmentSchedulingType;

  @Column({
    type: "enum",
    enum: EAppointmentCommunicationType,
    name: "communication_type",
  })
  communicationType: EAppointmentCommunicationType;

  @Column({
    type: "enum",
    enum: EAppointmentInterpretingType,
    name: "interpreting_type",
  })
  interpretingType: EAppointmentInterpretingType;

  @Column({
    type: "enum",
    enum: ERateQualifier,
    name: "qualifier",
  })
  qualifier: ERateQualifier;

  @Column({ type: "varchar", name: "details" })
  details: TRateTiming;

  @Column({
    type: "enum",
    enum: ERateDetailsSequence,
    name: "details_sequence",
  })
  detailsSequence: ERateDetailsSequence;

  @Column({ type: "integer", name: "details_time" })
  detailsTime: number;

  @Column({ type: "time", name: "normal_hours_start", nullable: false })
  normalHoursStart: TimeString;

  @Column({ type: "time", name: "normal_hours_end", nullable: false })
  normalHoursEnd: TimeString;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_general_with_gst", nullable: false })
  paidByTakerGeneralWithGst: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_general_without_gst", nullable: false })
  paidByTakerGeneralWithoutGst: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_special_with_gst", nullable: true })
  paidByTakerSpecialWithGst: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_special_without_gst", nullable: true })
  paidByTakerSpecialWithoutGst: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "lfh_commission_general", nullable: false })
  lfhCommissionGeneral: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "lfh_commission_special", nullable: true })
  lfhCommissionSpecial: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_to_interpreter_general_with_gst", nullable: false })
  paidToInterpreterGeneralWithGst: string;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    name: "paid_to_interpreter_general_without_gst",
    nullable: false,
  })
  paidToInterpreterGeneralWithoutGst: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_to_interpreter_special_with_gst", nullable: true })
  paidToInterpreterSpecialWithGst: string | null;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    name: "paid_to_interpreter_special_without_gst",
    nullable: true,
  })
  paidToInterpreterSpecialWithoutGst: string | null;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_by_taker_general_with_gst_per_minute",
    nullable: false,
  })
  paidByTakerGeneralWithGstPerMinute: string;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_by_taker_general_without_gst_per_minute",
    nullable: false,
  })
  paidByTakerGeneralWithoutGstPerMinute: string;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_by_taker_special_with_gst_per_minute",
    nullable: true,
  })
  paidByTakerSpecialWithGstPerMinute: string | null;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_by_taker_special_without_gst_per_minute",
    nullable: true,
  })
  paidByTakerSpecialWithoutGstPerMinute: string | null;

  @Column({ type: "numeric", precision: 14, scale: 12, name: "lfh_commission_general_per_minute", nullable: false })
  lfhCommissionGeneralPerMinute: string;

  @Column({ type: "numeric", precision: 14, scale: 12, name: "lfh_commission_special_per_minute", nullable: true })
  lfhCommissionSpecialPerMinute: string | null;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_to_interpreter_general_with_gst_per_minute",
    nullable: false,
  })
  paidToInterpreterGeneralWithGstPerMinute: string;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_to_interpreter_general_without_gst_per_minute",
    nullable: false,
  })
  paidToInterpreterGeneralWithoutGstPerMinute: string;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_to_interpreter_special_with_gst_per_minute",
    nullable: true,
  })
  paidToInterpreterSpecialWithGstPerMinute: string | null;

  @Column({
    type: "numeric",
    precision: 14,
    scale: 12,
    name: "paid_to_interpreter_special_without_gst_per_minute",
    nullable: true,
  })
  paidToInterpreterSpecialWithoutGstPerMinute: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
