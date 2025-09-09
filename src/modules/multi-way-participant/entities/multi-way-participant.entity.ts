import { Exclude } from "class-transformer";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Entity({ name: "multi_way_participants" })
export class MultiWayParticipant {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "multi_way_participants_PK" })
  id: string;

  @ManyToOne(() => Appointment, (appointment) => appointment.participants, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "multi_way_participants_appointments_FK",
  })
  appointment: Appointment;

  @Exclude()
  @Column({ type: "uuid", name: "appointment_id", nullable: false })
  @RelationId((participant: MultiWayParticipant) => participant.appointment)
  appointmentId: string;

  @Column({ type: "varchar", name: "name" })
  name: string;

  @Column({ type: "int", name: "age", nullable: true })
  age: number | null;

  @Column({ type: "varchar", name: "phone_code", nullable: true })
  phoneCode: string | null;

  @Column({ type: "varchar", name: "phone_number", nullable: true })
  phoneNumber: string | null;

  @Column({ type: "varchar", name: "email", nullable: true })
  email: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
