import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EChannelStatus, EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";

@Entity("channels")
export class Channel {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "channels_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    unique: true,
  })
  platformId: string;

  @Column({ type: "varchar", name: "channel_arn", nullable: true })
  channelArn: string | null;

  @Column({ type: "enum", enum: EChannelType, nullable: false })
  type: EChannelType;

  @Column({ type: "enum", enum: EChannelStatus, nullable: false })
  status: EChannelStatus;

  @Column({ type: "varchar", name: "appointment_id", nullable: true })
  appointmentId: string | null;

  @Column({ type: "varchar", name: "appointments_group_id", nullable: true })
  appointmentsGroupId: string | null;

  @Column({ type: "varchar", name: "appointment_platform_id", nullable: true })
  appointmentPlatformId: string | null;

  @Column({ type: "uuid", name: "operated_by_company_id" })
  operatedByCompanyId: string;

  @Column({ type: "text", array: true, name: "file_keys", default: [] })
  fileKeys: string[];

  @OneToMany(() => ChannelMembership, (channelMembership) => channelMembership.channel, { onDelete: "CASCADE" })
  channelMemberships: ChannelMembership[];

  @Column({ type: "timestamptz", name: "resolved_date", nullable: true })
  resolvedDate: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    this.platformId = await setPlatformId(ESequenceName.CHANNEL);
  }
}
