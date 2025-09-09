import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("incoming_payments_wait_list")
export class OldIncomingPaymentsWaitList {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "incoming_payments_wait_list_PK" })
  id: string;

  @OneToOne(() => Appointment, (appointment) => appointment.incomingPaymentsWaitList, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "incoming_payments_wait_list_appointments_FK",
  })
  appointment: Appointment;

  @Column({ type: "integer", name: "payment_attempt_count", default: 0 })
  paymentAttemptCount: number;

  @Column({ type: "boolean", name: "is_short_time_slot", default: false })
  isShortTimeSlot: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
