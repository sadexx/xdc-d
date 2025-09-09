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
import { EMembershipAssignmentStatus } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";
import { DiscountHolder } from "src/modules/discounts/entities";

@Entity({ name: "membership_assignments" })
export class MembershipAssignment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "membership_assignments_PK" })
  id: string;

  @Column({
    type: "enum",
    enum: EMembershipAssignmentStatus,
    name: "status",
  })
  status: EMembershipAssignmentStatus;

  @Column({ type: "integer", name: "discount" })
  discount: number;

  @Column({ type: "integer", name: "on_demand_minutes" })
  onDemandMinutes: number;

  @Column({ type: "integer", name: "pre_booked_minutes" })
  preBookedMinutes: number;

  @Column({ type: "timestamptz", name: "start_date", nullable: true })
  startDate: Date | null;

  @Column({ type: "timestamptz", name: "end_date", nullable: true })
  endDate: Date | null;

  @Index("membership_assignments_current_membership_id_IDX")
  @ManyToOne(() => Membership, (membership) => membership.currentMemberships, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "current_membership_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "current_membership_assignments_memberships_FK",
  })
  currentMembership: Membership;

  @Index("membership_assignments_next_membership_id_IDX")
  @ManyToOne(() => Membership, (membership) => membership.nextMemberships, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "next_membership_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "next_membership_assignments_memberships_FK",
  })
  nextMembership: Membership | null;

  @OneToOne(() => DiscountHolder, (discountHolder) => discountHolder.membershipAssignment)
  discountHolder: DiscountHolder;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
