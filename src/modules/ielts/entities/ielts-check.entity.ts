import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { EIeltsMessage, EIeltsStatus } from "src/modules/ielts/common/enums";

@Entity("ielts_checks")
export class IeltsCheck {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "ielts_checks_PK" })
  id: string;

  @Column({ type: "varchar", name: "trf_number" })
  trfNumber: string;

  @Column({ type: "enum", enum: EIeltsStatus, name: "status", nullable: true })
  status: EIeltsStatus | null;

  @Column({ type: "enum", enum: EIeltsMessage, name: "message", nullable: true })
  message: EIeltsMessage | null;

  @OneToOne(() => UserRole, (userRole) => userRole.ieltsCheck, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "ielts_checks_user_roles_FK",
  })
  userRole: UserRole;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
