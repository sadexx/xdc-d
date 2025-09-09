import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EChannelMembershipType } from "src/modules/chime-messaging-configuration/common/enums";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { UserRole } from "src/modules/users/entities";

@Entity("channel_memberships")
export class ChannelMembership {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "channel_memberships_PK" })
  id: string;

  @Column({ type: "varchar", name: "instance_user_arn", nullable: true })
  instanceUserArn: string | null;

  @Column({ type: "enum", enum: EChannelMembershipType, default: EChannelMembershipType.MEMBER, nullable: false })
  type: EChannelMembershipType;

  @Column({ type: "int", name: "unread_messages_count", default: 0 })
  unreadMessagesCount: number;

  @ManyToOne(() => Channel, (channel) => channel.channelMemberships, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "channel_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "channel_memberships_channels_FK",
  })
  channel: Channel;

  @ManyToOne(() => UserRole, (userRole) => userRole.channelMemberships, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "channel_memberships_user_roles_FK",
  })
  userRole: UserRole | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
