import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EAvatarStatus } from "src/modules/user-avatars/common/enums";
import { User } from "src/modules/users/entities";

@Entity("user_avatar_requests")
export class UserAvatarRequest {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "user_avatar_requests_PK" })
  id: string;

  @Column({
    type: "enum",
    enum: EAvatarStatus,
    name: "user_avatar_status",
    default: EAvatarStatus.UNDER_REVIEW,
  })
  status: EAvatarStatus;

  @Column({ type: "varchar", name: "avatar_url", nullable: true })
  avatarUrl: string | null;

  @OneToOne(() => User, (user) => user.avatar, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_avatar_requests_users_FK",
  })
  user: User;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
