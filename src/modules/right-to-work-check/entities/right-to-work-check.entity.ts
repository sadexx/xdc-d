import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";
import { LanguagePair } from "src/modules/interpreters/profile/entities";

@Entity("right_to_work_checks")
export class RightToWorkCheck {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "right_to_work_checks_PK" })
  id: string;

  @Column({ type: "enum", enum: ELanguages, name: "language_from" })
  languageFrom: ELanguages;

  @Column({ type: "enum", enum: ELanguages, name: "language_to" })
  languageTo: ELanguages;

  @Column({ type: "varchar", name: "document_name" })
  documentName: string;

  @Column({
    type: "enum",
    enum: ERightToWorkCheckStatus,
    default: ERightToWorkCheckStatus.INITIALIZED,
  })
  status: ERightToWorkCheckStatus;

  @ManyToOne(() => UserRole, (userRole) => userRole.rightToWorkChecks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "right_to_work_checks_user_roles_FK",
  })
  userRole: UserRole;

  @OneToOne(() => UserDocument, (document) => document.rightToWorkCheck)
  document: UserDocument | null;

  @OneToMany(() => LanguagePair, (languagePair) => languagePair.rightToWorkCheck)
  languagePairs: LanguagePair[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
