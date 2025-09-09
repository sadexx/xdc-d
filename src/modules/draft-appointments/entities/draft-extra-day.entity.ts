import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DraftAddress, DraftAppointment } from "src/modules/draft-appointments/entities";

@Entity("draft_extra_days")
export class DraftExtraDay {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "draft_extra_days_PK" })
  id: string;

  @Index("draft_extra_days_draft_appointment_id_IDX")
  @ManyToOne(() => DraftAppointment, (draftAppointment) => draftAppointment.draftExtraDays, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "draft_appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "draft_extra_days_draft_appointments_FK",
  })
  draftAppointment: DraftAppointment;

  @OneToOne(() => DraftAddress, (draftAddress) => draftAddress.draftExtraDay, { nullable: true })
  draftAddress: DraftAddress | null;

  @Column({ type: "timestamptz", name: "scheduled_start_time" })
  scheduledStartTime: Date;

  @Column({ type: "integer", name: "scheduling_duration" })
  schedulingDurationMin: number;

  @Column({ type: "boolean", name: "scheduling_extra_day", nullable: true })
  sameAddress: boolean | null;

  @Column({ type: "text", name: "notes", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
