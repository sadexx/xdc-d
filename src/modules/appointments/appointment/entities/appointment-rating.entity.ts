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

@Entity({ name: "appointment_ratings" })
export class AppointmentRating {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointment_ratings_PK" })
  id: string;

  @Column({ type: "int", name: "appointment_call_rating", default: 5 })
  appointmentCallRating: number;

  @Column({ type: "text", name: "appointment_call_rating_feedback", nullable: true })
  appointmentCallRatingFeedback: string | null;

  @Column({ type: "int", name: "interpreter_rating", default: 5 })
  interpreterRating: number;

  @Column({ type: "text", name: "interpreter_rating_feedback", nullable: true })
  interpreterRatingFeedback: string | null;

  @Column({ type: "uuid", name: "interpreter_id", nullable: true })
  interpreterId: string | null;

  @Column({ type: "boolean", name: "exclude_interpreter_rating", default: false })
  excludeInterpreterRating: boolean;

  @Column({ type: "boolean", name: "client_rated_interpreter", default: false })
  clientRatedInterpreter: boolean;

  @Column({ type: "boolean", name: "interpreter_rated_call_quality", default: false })
  interpreterRatedCallQuality: boolean;

  @OneToOne(() => Appointment, (appointment) => appointment.appointmentRating, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointment_ratings_appointments_FK",
  })
  appointment: Appointment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
