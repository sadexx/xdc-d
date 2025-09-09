import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { EUserGender } from "src/modules/users/common/enums";
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { DraftAddress, DraftExtraDay, DraftMultiWayParticipant } from "src/modules/draft-appointments/entities";
import { Exclude } from "class-transformer";
import { UserRole } from "src/modules/users/entities";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";

@Entity("draft_appointments")
export class DraftAppointment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "draft_appointments_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    unique: true,
  })
  platformId: string;

  /**
   *? Individual Client
   */

  @Exclude()
  @Index("draft_appointments_client_id_IDX")
  @Column({ type: "uuid", name: "client_id" })
  @RelationId((draftAppointment: DraftAppointment) => draftAppointment.client)
  clientId: string;

  @ManyToOne(() => UserRole, (client) => client.clientDraftAppointments, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "client_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "draft_appointments_clients_FK",
  })
  client: UserRole;

  /**
   *? Relations Fields
   */

  @OneToMany(() => DraftMultiWayParticipant, (draftParticipant) => draftParticipant.draftAppointment)
  draftParticipants: DraftMultiWayParticipant[];

  @OneToOne(() => DraftAddress, (draftAddress) => draftAddress.draftAppointment, { nullable: true })
  draftAddress: DraftAddress | null;

  @OneToMany(() => DraftExtraDay, (draftExtraDay) => draftExtraDay.draftAppointment)
  draftExtraDays: DraftExtraDay[];

  /**
   ** Public Fields
   */

  @Column({ type: "timestamptz", name: "scheduled_start_time" })
  scheduledStartTime: Date;

  @Column({
    type: "enum",
    enum: EAppointmentCommunicationType,
    name: "communication_type",
  })
  communicationType: EAppointmentCommunicationType;

  @Column({
    type: "enum",
    enum: EAppointmentSchedulingType,
    name: "scheduling_type",
  })
  schedulingType: EAppointmentSchedulingType;

  @Column({ type: "integer", name: "scheduling_duration" })
  schedulingDurationMin: number;

  @Column({
    type: "enum",
    enum: EAppointmentTopic,
    name: "topic",
  })
  topic: EAppointmentTopic;

  @Column({
    type: "enum",
    enum: EUserGender,
    name: "preferred_interpreter_gender",
    nullable: true,
  })
  preferredInterpreterGender: EUserGender | null;

  @Column({
    type: "enum",
    enum: EAppointmentInterpreterType,
    name: "interpreter_type",
  })
  interpreterType: EAppointmentInterpreterType;

  @Column({
    type: "enum",
    enum: EAppointmentInterpretingType,
    name: "interpreting_type",
  })
  interpretingType: EAppointmentInterpretingType;

  @Column({
    type: "enum",
    enum: EAppointmentSimultaneousInterpretingType,
    name: "simultaneous_interpreting_type",
    nullable: true,
  })
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType | null;

  @Column({
    type: "enum",
    enum: ELanguages,
    name: "language_from",
  })
  languageFrom: ELanguages;

  @Column({
    type: "enum",
    enum: ELanguages,
    name: "language_to",
  })
  languageTo: ELanguages;

  @Column({
    type: "enum",
    enum: EAppointmentParticipantType,
    name: "participant_type",
  })
  participantType: EAppointmentParticipantType;

  @Column({ type: "boolean", name: "alternative_platform" })
  alternativePlatform: boolean;

  @Column({
    type: "varchar",
    name: "alternative_video_conferencing_platform_link",
    nullable: true,
  })
  alternativeVideoConferencingPlatformLink: string | null;

  @Column({ type: "text", name: "notes", nullable: true })
  notes: string | null;

  @Column({ type: "boolean", name: "scheduling_extra_day" })
  schedulingExtraDay: boolean;

  @Column({ type: "varchar", name: "status", default: "draft-pending" })
  status: string;

  @Column({ type: "boolean", name: "is_group_appointment" })
  isGroupAppointment: boolean;

  @Column({ type: "boolean", name: "same_interpreter" })
  sameInterpreter: boolean;

  @Column({ type: "varchar", name: "operated_by_company_name" })
  operatedByCompanyName: string;

  @Column({ type: "uuid", name: "operated_by_company_id" })
  operatedByCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_main_corporate_company_name", nullable: true })
  operatedByMainCorporateCompanyName: string | null;

  @Column({ type: "uuid", name: "operated_by_main_corporate_company_id", nullable: true })
  operatedByMainCorporateCompanyId: string | null;

  @Column({ type: "boolean", name: "accept_overtime_rates" })
  acceptOvertimeRates: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    this.platformId = await setPlatformId(ESequenceName.DRAFT_APPOINTMENT);
  }
}
