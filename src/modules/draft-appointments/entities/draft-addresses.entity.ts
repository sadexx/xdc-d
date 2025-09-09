import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DraftAppointment, DraftExtraDay } from "src/modules/draft-appointments/entities";

@Entity("draft_addresses")
export class DraftAddress {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "draft_addresses_PK" })
  id: string;

  @Index("draft_addresses_draft_appointment_id_IDX")
  @OneToOne(() => DraftAppointment, (draftAppointment) => draftAppointment.draftAddress, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "draft_appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "draft_addresses_draft_appointments_FK",
  })
  draftAppointment: DraftAppointment | null;

  @Index("draft_addresses_draft_extra_day_id_IDX")
  @OneToOne(() => DraftExtraDay, (draftExtraDay) => draftExtraDay.draftAddress, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "draft_extra_day_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "draft_addresses_draft_extra_days_FK",
  })
  draftExtraDay: DraftExtraDay | null;

  @Column({ type: "double precision", name: "latitude" })
  latitude: number;

  @Column({ type: "double precision", name: "longitude" })
  longitude: number;

  @Column({ type: "varchar", name: "country" })
  country: string;

  @Column({ type: "varchar", name: "state" })
  state: string;

  @Column({ type: "varchar", name: "suburb" })
  suburb: string;

  @Column({ type: "varchar", name: "street_name" })
  streetName: string;

  @Column({ type: "varchar", name: "street_number" })
  streetNumber: string;

  @Column({ type: "varchar", name: "postcode" })
  postcode: string;

  @Column({ type: "varchar", name: "building", nullable: true })
  building: string | null;

  @Column({ type: "varchar", name: "unit", nullable: true })
  unit: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
