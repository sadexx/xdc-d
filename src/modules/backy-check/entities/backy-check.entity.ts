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
import {
  EExtCheckResult,
  EExtCheckStatus,
  EExtIssueState,
  EManualCheckResult,
} from "src/modules/backy-check/common/enums";
import { UserDocument } from "src/modules/users/entities";

@Entity("backy_checks")
export class BackyCheck {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "backy_checks_PK" })
  id: string;

  @Column({ type: "varchar", name: "wwcc_number", nullable: false })
  WWCCNumber: string;

  @Column({ type: "date", name: "expired_date", nullable: false })
  expiredDate: Date;

  @Column({ type: "enum", enum: EExtIssueState, name: "issue_state", nullable: false })
  issueState: EExtIssueState;

  @Column({ type: "varchar", name: "order_id", nullable: true })
  orderId: string | null;

  @Column({ type: "enum", enum: EExtCheckStatus, name: "check_status", nullable: true })
  checkStatus: EExtCheckStatus | null;

  @Column({ type: "enum", enum: EExtCheckResult, name: "check_results", nullable: true })
  checkResults: EExtCheckResult | null;

  @Column({ type: "enum", enum: EManualCheckResult, name: "manual_check_results", nullable: true })
  manualCheckResults: EManualCheckResult | null;

  @Column({ type: "varchar", name: "check_results_notes", nullable: true })
  checkResultsNotes: string | null;

  @Column({ type: "varchar", name: "order_officer_notes", nullable: true })
  orderOfficerNotes: string | null;

  @OneToOne(() => UserRole, (userRole) => userRole.backyCheck, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "backy_checks_user_roles_FK",
  })
  userRole: UserRole;

  @OneToOne(() => UserDocument, (document) => document.backyCheck)
  document: UserDocument | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
