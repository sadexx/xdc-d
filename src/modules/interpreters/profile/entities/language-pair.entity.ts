import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ELanguageLevel, ELanguages } from "src/modules/interpreters/profile/common/enum";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";

@Entity({ name: "language_pairs" })
export class LanguagePair {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "language_pairs_PK" })
  id: string;

  @ManyToOne(() => InterpreterProfile, (interpreterProfile) => interpreterProfile.languagePairs, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "interpreter_profile_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "language_pairs_interpreter_profiles_FK",
  })
  interpreterProfile: InterpreterProfile;

  @Column({ type: "enum", enum: ELanguageLevel, name: "type", default: ELanguageLevel.ZERO })
  languageLevel: ELanguageLevel;

  @Column({ type: "enum", enum: ELanguages, name: "language_from" })
  languageFrom: ELanguages;

  @Column({ type: "enum", enum: ELanguages, name: "language_to" })
  languageTo: ELanguages;

  @ManyToOne(() => RightToWorkCheck, (rightToWorkCheck) => rightToWorkCheck.languagePairs, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "right_to_work_check_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "language_pairs_right_to_work_checks_FK",
  })
  rightToWorkCheck: RightToWorkCheck | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
