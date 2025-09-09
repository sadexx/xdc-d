import { Appointment } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
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

@Entity({ name: "blacklists" })
export class Blacklist {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "blacklists_PK" })
  id: string;

  @ManyToOne(() => Appointment, (appointment) => appointment.blacklists, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "blacklists_appointments_FK",
  })
  appointment: Appointment;

  @ManyToOne(() => UserRole, (userRole) => userRole.blockedByUserRoles, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "blocked_by_user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "blacklists_blocked_by_user_roles_FK",
  })
  blockedByUserRole: UserRole;

  @RelationId((blacklist: Blacklist) => blacklist.blockedByUserRole)
  @Column({ type: "uuid", name: "blocked_by_user_role_id", nullable: false })
  blockedByUserRoleId: string;

  @ManyToOne(() => UserRole, (userRole) => userRole.blockedUserRoles, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "blocked_user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "blacklists_blocked_user_roles_FK",
  })
  blockedUserRole: UserRole;

  @RelationId((blacklist: Blacklist) => blacklist.blockedUserRole)
  @Column({ type: "uuid", name: "blocked_user_role_id", nullable: false })
  blockedUserRoleId: string;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
