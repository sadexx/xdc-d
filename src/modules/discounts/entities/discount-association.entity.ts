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
import { EMembershipType } from "src/modules/memberships/common/enums";

@Entity({ name: "discount_associations" })
export class DiscountAssociation {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "discount_associations_PK" })
  id: string;

  @Column({ type: "integer", name: "promo_campaign_discount", nullable: true })
  promoCampaignDiscount: number | null;

  @Column({ type: "integer", name: "membership_discount", nullable: true })
  membershipDiscount: number | null;

  @Column({ type: "integer", name: "promo_campaign_discount_minutes", nullable: true })
  promoCampaignDiscountMinutes: number | null;

  @Column({ type: "integer", name: "membership_free_minutes", nullable: true })
  membershipFreeMinutes: number | null;

  @Column({ type: "varchar", name: "promo_code", nullable: true })
  promoCode: string | null;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "membership_type",
    nullable: true,
  })
  membershipType: EMembershipType | null;

  @OneToOne(() => Appointment, (appointment) => appointment.discountAssociation, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_associations_appointments_FK",
  })
  appointment: Appointment;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
