import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Entity("short_urls")
export class ShortUrl {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "short_urls_PK" })
  id: string;

  @Column({ type: "varchar", name: "short_code", unique: true })
  shortCode: string;

  @Column({ type: "varchar", name: "destination_url" })
  destinationUrl: string;

  @Column({ type: "timestamptz", name: "active_from" })
  activeFrom: Date;

  @ManyToOne(() => Appointment, (appointment) => appointment.shortUrls, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "short_urls_appointments_FK",
  })
  appointment: Appointment;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
