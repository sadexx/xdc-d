import { Appointment, AppointmentCancellationInfo } from "src/modules/appointments/appointment/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "appointments_admin_info" })
export class AppointmentAdminInfo {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointments_admin_info_PK" })
  id: string;

  @OneToOne(() => Appointment, (appointment) => appointment.appointmentAdminInfo, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointments_admin_info_appointments_FK",
  })
  appointment: Appointment;

  @Index("appointments_admin_info_is_red_flag_enabled_IDX")
  @Column({ type: "boolean", name: "is_red_flag_enabled" })
  isRedFlagEnabled: boolean;

  @Column({ type: "boolean", name: "is_interpreter_found", default: false })
  isInterpreterFound: boolean;

  @Column({ type: "varchar", name: "message", nullable: true })
  message: string | null;

  @Column({ type: "varchar", name: "call_recording_s3_key", nullable: true })
  callRecordingS3Key: string | null;

  @Column({ type: "integer", name: "completed_meeting_duration" })
  completedMeetingDuration: number;

  @Column({ type: "varchar", name: "client_first_name", nullable: true })
  clientFirstName: string | null;

  @Column({ type: "varchar", name: "client_preferred_name", nullable: true })
  clientPreferredName: string | null;

  @Column({ type: "varchar", name: "client_last_name", nullable: true })
  clientLastName: string | null;

  @Column({ type: "varchar", name: "client_phone", nullable: true })
  clientPhone: string | null;

  @Column({ type: "varchar", name: "client_email", nullable: true })
  clientEmail: string | null;

  @Column({ type: "varchar", name: "client_date_of_birth", nullable: true })
  clientDateOfBirth: string | null;

  @Column({ type: "varchar", name: "interpreter_first_name", nullable: true })
  interpreterFirstName: string | null;

  @Column({ type: "varchar", name: "interpreter_preferred_name", nullable: true })
  interpreterPreferredName: string | null;

  @Column({ type: "varchar", name: "interpreter_last_name", nullable: true })
  interpreterLastName: string | null;

  @Column({ type: "varchar", name: "interpreter_phone", nullable: true })
  interpreterPhone: string | null;

  @Column({ type: "varchar", name: "interpreter_email", nullable: true })
  interpreterEmail: string | null;

  @Column({ type: "varchar", name: "interpreter_date_of_birth", nullable: true })
  interpreterDateOfBirth: string | null;

  @Column({ type: "timestamptz", name: "deep_archive_restore_expiration_date", nullable: true })
  deepArchiveRestoreExpirationDate: Date | null;

  @Column({ type: "timestamptz", name: "client_was_online_in_booking", nullable: true })
  clientWasOnlineInBooking: Date | null;

  @Column({ type: "timestamptz", name: "interpreter_was_online_in_booking", nullable: true })
  interpreterWasOnlineInBooking: Date | null;

  @OneToMany(() => AppointmentCancellationInfo, (cancellationInfo) => cancellationInfo.appointmentAdminInfo)
  cancellations: AppointmentCancellationInfo[];

  @Column({ type: "text", name: "notes", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
