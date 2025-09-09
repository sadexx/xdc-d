import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

@Entity("language_doc_checks")
export class LanguageDocCheck {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "language_doc_checks_PK" })
  id: string;

  @Column({ type: "varchar", name: "pte_test_registration_id", nullable: true })
  pteTestRegistrationId: string | null;

  @Column({ type: "varchar", name: "pte_score_report_code", nullable: true })
  pteScoreReportCode: string | null;

  @Column({
    type: "enum",
    name: "status",
    enum: ELanguageDocCheckRequestStatus,
    default: ELanguageDocCheckRequestStatus.INITIALIZED,
  })
  status: ELanguageDocCheckRequestStatus;

  @Column({
    type: "enum",
    name: "language",
    enum: ELanguages,
    default: ELanguages.ENGLISH,
  })
  language: ELanguages;

  @ManyToOne(() => UserRole, (userRole) => userRole.languageDocChecks, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "language_doc_checks_user_roles_FK",
  })
  userRole: UserRole;

  @OneToOne(() => UserDocument, (document) => document.languageDocCheck)
  document: UserDocument | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
