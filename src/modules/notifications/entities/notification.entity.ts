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
import { UserRole } from "src/modules/users/entities";
import { Exclude } from "class-transformer";
import { NotificationData } from "src/modules/notifications/common/interface";

@Entity({ name: "notifications" })
export class Notification {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "notifications_PK" })
  id: string;

  @Exclude()
  @Column({ type: "uuid", name: "user_role_id", nullable: false })
  @RelationId((notification: Notification) => notification.userRole)
  userRoleId: string;

  @ManyToOne(() => UserRole, (userRole) => userRole.notifications, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "notifications_user_roles_FK",
  })
  userRole: UserRole;

  @Column({ type: "varchar", name: "title" })
  title: string;

  @Column({ type: "varchar", name: "message" })
  message: string;

  @Column({ type: "jsonb", name: "extra_data" })
  extraData: NotificationData;

  @Column({ type: "boolean", name: "is_viewed", default: false })
  isViewed: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
