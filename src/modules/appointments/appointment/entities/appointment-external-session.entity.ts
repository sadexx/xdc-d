import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Entity({ name: "appointment_external_sessions" })
export class AppointmentExternalSession {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointment_external_sessions_PK" })
  id: string;

  @Column({ type: "varchar", name: "first_verifying_person_name" })
  firstVerifyingPersonName: string;

  @Column({ type: "text", name: "first_verifying_person_signature" })
  firstVerifyingPersonSignature: string;

  @Column({ type: "varchar", name: "second_verifying_person_name", nullable: true })
  secondVerifyingPersonName: string | null;

  @Column({ type: "text", name: "second_verifying_person_signature", nullable: true })
  secondVerifyingPersonSignature: string | null;

  @Column({ type: "timestamptz", name: "alternative_start_time", nullable: true })
  alternativeStartTime: Date | null;

  @Column({ type: "timestamptz", name: "alternative_end_time", nullable: true })
  alternativeEndTime: Date | null;

  @OneToOne(() => Appointment, (appointment) => appointment.appointmentExternalSession, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointment_external_sessions_appointments_FK",
  })
  appointment: Appointment;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
