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

@Entity({ name: "appointment_reminders" })
export class AppointmentReminder {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointment_reminders_PK" })
  id: string;

  @OneToOne(() => Appointment, (appointment) => appointment.appointmentReminder, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointment_reminders_appointments_FK",
  })
  appointment: Appointment;

  @Column({ type: "boolean", name: "is_reminder_sent_two_minutes", default: false })
  isReminderSentTwoMinutes: boolean;

  @Column({ type: "boolean", name: "is_reminder_sent_ten_minutes", default: false })
  isReminderSentTenMinutes: boolean;

  @Column({ type: "boolean", name: "is_reminder_sent_two_hours", default: false })
  isReminderSentTwoHours: boolean;

  @Column({ type: "boolean", name: "is_reminder_sent_twenty_four_hours", default: false })
  isReminderSentTwentyFourHours: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
