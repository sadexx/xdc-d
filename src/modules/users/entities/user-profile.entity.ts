import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EUserGender, EUserTitle } from "src/modules/users/common/enums";
import { UserRole } from "src/modules/users/entities";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "user_profiles_PK" })
  id: string;

  @Column({
    type: "enum",
    enum: EUserTitle,
    name: "title",
    nullable: true,
  })
  title: EUserTitle | null;

  @Column({ type: "varchar", name: "first_name" })
  firstName: string;

  @Column({ type: "varchar", name: "middle_name", nullable: true })
  middleName: string | null;

  @Column({ type: "varchar", name: "last_name" })
  lastName: string;

  @Column({ type: "varchar", name: "preferred_name", nullable: true })
  preferredName: string | null;

  @Column({ type: "date", name: "date_of_birth" })
  dateOfBirth: string;

  @Column({
    type: "enum",
    enum: EUserGender,
    name: "user_gender",
  })
  gender: EUserGender;

  @Column({ type: "varchar", name: "contact_email" })
  contactEmail: string;

  @Column({ type: "enum", enum: ELanguages, name: "native_language", nullable: true })
  nativeLanguage: ELanguages | null;

  @Column({ type: "boolean", name: "is_identify_as_aboriginal_or_torres_strait_islander", nullable: true })
  isIdentifyAsAboriginalOrTorresStraitIslander: boolean | null;

  @OneToOne(() => UserRole, (userRole) => userRole.profile, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_profiles_user_roles_FK",
  })
  userRole: UserRole;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
