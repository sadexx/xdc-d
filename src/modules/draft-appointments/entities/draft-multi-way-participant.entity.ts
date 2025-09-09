import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DraftAppointment } from "src/modules/draft-appointments/entities";

@Entity("draft_multi_way_participants")
export class DraftMultiWayParticipant {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "draft_multi_way_participants_PK" })
  id: string;

  @Index("draft_multi_way_participants_draft_appointment_id_IDX")
  @ManyToOne(() => DraftAppointment, (draftAppointment) => draftAppointment.draftParticipants, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "draft_appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "draft_multi_way_participants_draft_appointments_FK",
  })
  draftAppointment: DraftAppointment;

  @Column({ type: "varchar", name: "name" })
  name: string;

  @Column({ type: "int", name: "age", nullable: true })
  age: number | null;

  @Column({ type: "varchar", name: "phone_code" })
  phoneCode: string;

  @Column({ type: "varchar", name: "phone_number" })
  phoneNumber: string;

  @Column({ type: "varchar", name: "email", nullable: true })
  email: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
