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
import { EExtMediaCapabilities } from "src/modules/chime-meeting-configuration/common/enums";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Exclude } from "class-transformer";

@Entity({ name: "attendees" })
export class Attendee {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "attendees_PK" })
  id: string;

  @Exclude()
  @Column({ type: "uuid", name: "chime_meeting_configuration_id", nullable: false })
  @RelationId((attendee: Attendee) => attendee.chimeMeetingConfiguration)
  chimeMeetingConfigurationId: string;

  @ManyToOne(() => ChimeMeetingConfiguration, (chimeMeetingConfiguration) => chimeMeetingConfiguration.attendees, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "chime_meeting_configuration_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "attendees_chime_meeting_configurations_FK",
  })
  chimeMeetingConfiguration: ChimeMeetingConfiguration;

  @Column({ type: "uuid", name: "external_user_id" })
  externalUserId: string;

  @Column({
    type: "enum",
    name: "role_name",
    enum: EUserRoleName,
  })
  roleName: EUserRoleName;

  @Column({ type: "uuid", name: "attendee_id", nullable: true })
  attendeeId: string;

  @Column({ type: "boolean", name: "is_online" })
  isOnline: boolean;

  @Column({ type: "boolean", name: "is_anonymous_guest" })
  isAnonymousGuest: boolean;

  @Column({ type: "varchar", name: "join_url" })
  joinUrl: string;

  @Column({ type: "varchar", name: "guest_phone_number", nullable: true })
  guestPhoneNumber: string | null;

  @Column({ type: "varchar", name: "join_token", nullable: true })
  joinToken: string;

  @Column({
    type: "enum",
    enum: EExtMediaCapabilities,
    name: "audio_capabilities",
  })
  audioCapabilities: EExtMediaCapabilities;

  @Column({
    type: "enum",
    enum: EExtMediaCapabilities,
    name: "video_capabilities",
  })
  videoCapabilities: EExtMediaCapabilities;

  @Column({
    type: "enum",
    enum: EExtMediaCapabilities,
    name: "content_capabilities",
  })
  contentCapabilities: EExtMediaCapabilities;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
