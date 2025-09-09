import { UserRole } from "src/modules/users/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";
import { LanguagePair } from "src/modules/interpreters/profile/entities";
import { InterpreterCancellationRecord } from "src/modules/interpreters/profile/entities";

@Entity({ name: "interpreter_profiles" })
export class InterpreterProfile {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "interpreter_profiles_PK" })
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.interpreterProfile, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "interpreter_profiles_user_roles_FK",
  })
  userRole: UserRole;

  @OneToOne(() => InterpreterCancellationRecord, (record) => record.interpreterProfile, {
    nullable: true,
  })
  cancellationRecord: InterpreterCancellationRecord | null;

  @Column({ type: "enum", array: true, enum: EInterpreterType, name: "type", default: [EInterpreterType.INTERPRETER] })
  type: EInterpreterType[];

  @Column({ type: "enum", enum: EInterpreterCertificateType, name: "certificate_type" })
  certificateType: EInterpreterCertificateType;

  @Column({ type: "enum", array: true, enum: ELanguages, name: "known_languages" })
  knownLanguages: ELanguages[];

  @Column({ type: "enum", array: true, enum: ELanguageLevel, name: "known_levels", default: [ELanguageLevel.ZERO] })
  knownLevels: ELanguageLevel[];

  @OneToMany(() => LanguagePair, (languagePair) => languagePair.interpreterProfile)
  languagePairs: LanguagePair[];

  @Column({ type: "float", name: "average_rating", default: 5 })
  averageRating: number;

  @Column({ type: "boolean", name: "audio_on_demand_setting", default: false })
  audioOnDemandSetting: boolean;

  @Column({ type: "boolean", name: "video_on_demand_setting", default: false })
  videoOnDemandSetting: boolean;

  @Column({ type: "boolean", name: "face_to_face_on_demand_setting", default: false })
  faceToFaceOnDemandSetting: boolean;

  @Column({ type: "boolean", name: "audio_pre_booked_setting", default: false })
  audioPreBookedSetting: boolean;

  @Column({ type: "boolean", name: "video_pre_booked_setting", default: false })
  videoPreBookedSetting: boolean;

  @Column({ type: "boolean", name: "face_to_face_pre_booked_setting", default: false })
  faceToFacePreBookedSetting: boolean;

  @Column({ type: "boolean", name: "consecutive_legal_setting", default: false })
  consecutiveLegalSetting: boolean;

  @Column({ type: "boolean", name: "consecutive_medical_setting", default: false })
  consecutiveMedicalSetting: boolean;

  @Column({ type: "boolean", name: "conference_simultaneous_setting", default: false })
  conferenceSimultaneousSetting: boolean;

  @Column({ type: "boolean", name: "sign_language_setting", default: false })
  signLanguageSetting: boolean;

  @Column({ type: "boolean", name: "consecutive_general_setting", default: false })
  consecutiveGeneralSetting: boolean;

  @Column({ type: "boolean", name: "is_online_for_audio", default: false })
  isOnlineForAudio: boolean;

  @Column({ type: "boolean", name: "is_online_for_video", default: false })
  isOnlineForVideo: boolean;

  @Column({ type: "boolean", name: "is_online_for_face_to_face", default: false })
  isOnlineForFaceToFace: boolean;

  @Column({ type: "timestamptz", name: "end_of_work_day", nullable: true })
  endOfWorkDay: Date | null;

  @Column({ type: "timestamptz", name: "online_since", nullable: true })
  onlineSince: Date | null;

  @Column({ type: "timestamptz", name: "offline_since", nullable: true })
  offlineSince: Date | null;

  @Column({ type: "double precision", name: "latitude", nullable: true })
  latitude: number | null;

  @Column({ type: "double precision", name: "longitude", nullable: true })
  longitude: number | null;

  @Column({ type: "text", name: "interpreter_badge", nullable: true })
  interpreterBadge: string | null;

  @Column({ type: "text", name: "interpreter_badge_pdf", nullable: true })
  interpreterBadgePdf: string | null;

  @Column({ type: "boolean", name: "is_temporary_blocked", default: false })
  isTemporaryBlocked: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
