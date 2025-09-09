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
import { UserRole } from "src/modules/users/entities";
import { EDocumentType } from "src/modules/users/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";

@Entity("user_documents")
export class UserDocument {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "user_documents_PK" })
  id: string;

  @Column({ type: "enum", enum: EDocumentType, name: "document_type" })
  documentType: EDocumentType;

  @Column({ type: "varchar", name: "s3_key" })
  s3Key: string;

  @ManyToOne(() => UserRole, (userRole) => userRole.documents, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_documents_user_roles_FK",
  })
  userRole: UserRole;

  @OneToOne(() => BackyCheck, (backyCheck) => backyCheck.document, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "backy_check_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_documents_backy_checks_FK",
  })
  backyCheck: BackyCheck | null;

  @OneToOne(() => UserConcessionCard, (userConcessionCard) => userConcessionCard.document, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "user_concession_card_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_documents_user_concession_cards_FK",
  })
  userConcessionCard: UserConcessionCard | null;

  @OneToOne(() => LanguageDocCheck, (languageDocCheck) => languageDocCheck.document, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "language_doc_check_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_documents_language_doc_checks_FK",
  })
  languageDocCheck: LanguageDocCheck | null;

  @OneToOne(() => RightToWorkCheck, (rightToWorkCheck) => rightToWorkCheck.document, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "right_to_work_check_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_documents_right_to_work_checks_FK",
  })
  rightToWorkCheck: RightToWorkCheck | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
