import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EMembershipStatus, EMembershipType } from "src/modules/memberships/common/enums";
import { MembershipAssignment, MembershipPrice } from "src/modules/memberships/entities";

@Entity({ name: "memberships" })
export class Membership {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "memberships_PK" })
  id: string;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "type",
  })
  type: EMembershipType;

  @Column({
    type: "enum",
    enum: EMembershipStatus,
    name: "status",
  })
  status: EMembershipStatus;

  @Column({ type: "integer", name: "discount" })
  discount: number;

  @Column({ type: "integer", name: "on_demand_minutes" })
  onDemandMinutes: number;

  @Column({ type: "integer", name: "pre_booked_minutes" })
  preBookedMinutes: number;

  @Column({ type: "boolean", name: "is_most_popular", default: false })
  isMostPopular: boolean;

  @OneToMany(() => MembershipPrice, (membershipPrice) => membershipPrice.membership, { cascade: ["insert"] })
  membershipPrices: MembershipPrice[];

  @OneToMany(() => MembershipAssignment, (membershipAssignment) => membershipAssignment.currentMembership)
  currentMemberships: MembershipAssignment[];

  @OneToMany(() => MembershipAssignment, (membershipAssignment) => membershipAssignment.nextMembership)
  nextMemberships: MembershipAssignment[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
