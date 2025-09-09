import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { IMeeting } from "src/modules/chime-meeting-configuration/common/interfaces";
import { Attendee } from "src/modules/chime-meeting-configuration/entities";
import {
  EExternalVideoResolution,
  EExtMeetingFeatureStatus,
  EExtVideoContentResolution,
} from "src/modules/chime-meeting-configuration/common/enums";
import { Exclude } from "class-transformer";

@Entity({ name: "chime_meeting_configurations" })
export class ChimeMeetingConfiguration {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "chime_meeting_configurations_PK" })
  id: string;

  @Exclude()
  @Column({ type: "uuid", name: "appointment_id", nullable: false })
  @RelationId((chimeMeetingConfiguration: ChimeMeetingConfiguration) => chimeMeetingConfiguration.appointment)
  appointmentId: string;

  @OneToOne(() => Appointment, (appointment) => appointment.chimeMeetingConfiguration, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "chime_meeting_configurations_appointments_FK",
  })
  appointment: Appointment;

  @OneToMany(() => Attendee, (attendees) => attendees.chimeMeetingConfiguration)
  attendees: Attendee[];

  @Column({ type: "uuid", name: "chime_meeting_id", nullable: true })
  chimeMeetingId: string | null;

  @Column({ type: "timestamptz", name: "meeting_scheduled_start_time" })
  meetingScheduledStartTime: Date;

  @Column({ type: "enum", enum: EExtMeetingFeatureStatus, name: "echo_reduction" })
  echoReduction: EExtMeetingFeatureStatus;

  @Column({ type: "enum", enum: EExternalVideoResolution, name: "max_video_resolution" })
  maxVideoResolution: EExternalVideoResolution;

  @Column({ type: "enum", enum: EExtVideoContentResolution, name: "max_content_resolution" })
  maxContentResolution: EExtVideoContentResolution;

  @Column({ type: "integer", name: "max_attendees" })
  maxAttendees: number;

  @Column({ type: "timestamptz", name: "meeting_launch_time", nullable: true })
  meetingLaunchTime: Date | null;

  @Column({ type: "varchar", name: "media_region", nullable: true })
  mediaRegion: string | null;

  @Column({ type: "varchar", name: "media_pipeline_id", nullable: true })
  mediaPipelineId: string | null;

  @Column({ type: "boolean", name: "call_recording_enabled", default: false })
  callRecordingEnabled: boolean;

  @Column({ type: "integer", name: "client_pstn_call_count", default: 0 })
  clientPstnCallCount: number;

  @Column({ type: "boolean", name: "is_client_was_online_in_booking", nullable: true })
  isClientWasOnlineInBooking: boolean | null;

  @Column({ type: "boolean", name: "is_interpreter_was_online_in_booking", nullable: true })
  isInterpreterWasOnlineInBooking: boolean | null;

  @Column({ type: "jsonb", name: "meeting", nullable: true })
  meeting: IMeeting | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
