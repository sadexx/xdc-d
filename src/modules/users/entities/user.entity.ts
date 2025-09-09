import { Exclude } from "class-transformer";
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { Session } from "src/modules/sessions/entities";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "users_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string | null;

  @Column({ name: "email", type: "varchar", unique: true })
  email: string;

  @Column({ name: "is_email_verified", type: "boolean", default: false })
  isEmailVerified: boolean;

  @Column({ name: "phone_number", type: "varchar", nullable: true, unique: true })
  phoneNumber: string | null;

  @Column({
    name: "is_two_step_verification_enabled",
    type: "boolean",
    default: false,
  })
  isTwoStepVerificationEnabled: boolean;

  @Exclude()
  @Column({ name: "password", type: "varchar", nullable: true })
  password: string | null;

  @Column({ name: "is_registration_finished", type: "boolean", default: false })
  isRegistrationFinished: boolean;

  @Column({ name: "is_default_avatar", type: "boolean", default: false })
  isDefaultAvatar: boolean;

  @Column({ type: "varchar", name: "avatar_url", nullable: true })
  avatarUrl: string | null;

  @Column({ name: "is_in_delete_waiting", type: "boolean", default: false })
  isInDeleteWaiting: boolean;

  @Column({ type: "timestamptz", name: "deleting_date", nullable: true })
  deletingDate: Date | null;

  @Column({ type: "uuid", name: "restoration_key", nullable: true })
  restorationKey: string | null;

  @OneToOne(() => UserAvatarRequest, (avatar) => avatar.user, { nullable: true })
  avatar: UserAvatarRequest | null;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToOne(() => Company, (company) => company.superAdmin, { nullable: true, onDelete: "CASCADE" })
  administratedCompany: Company | null;

  @OneToMany(() => UserRole, (userRoles) => userRoles.user, { cascade: ["insert", "update", "remove"] })
  userRoles: UserRole[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeUpdate()
  @BeforeInsert()
  async setPlatformId(): Promise<void> {
    if (!this.platformId && this.isRegistrationFinished) {
      this.platformId = await setPlatformId(ESequenceName.CUSTOMER);
    }
  }
}
