import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  EPromoCampaignApplication,
  EPromoCampaignDuration,
  EPromoCampaignStatus,
  EPromoCampaignTarget,
} from "src/modules/promo-campaigns/common/enums";
import {
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { PromoCampaignAssignment, PromoCampaignBanner } from "src/modules/promo-campaigns/entities";

@Entity({ name: "promo_campaigns" })
export class PromoCampaign {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "promo_campaigns_PK" })
  id: string;

  @Column({ type: "varchar", name: "name", unique: true })
  name: string;

  @Column({ type: "varchar", name: "promo_code", unique: true })
  promoCode: string;

  @Column({ type: "integer", name: "discount" })
  discount: number;

  @Column({ type: "integer", name: "discount_minutes", nullable: true })
  discountMinutes: number | null;

  @Column({ type: "timestamptz", name: "start_date" })
  startDate: Date;

  @Column({ type: "timestamptz", name: "end_date", nullable: true })
  endDate: Date | null;

  @Column({ type: "integer", name: "usage_limit", nullable: true })
  usageLimit: number | null;

  @Column({ type: "integer", name: "total_times_used", default: 0 })
  totalTimesUsed: number;

  @Column({ type: "varchar", name: "partner_name", nullable: true })
  partnerName: string | null;

  @Column({
    type: "enum",
    enum: EPromoCampaignStatus,
    name: "status",
    default: EPromoCampaignStatus.PENDING,
  })
  status: EPromoCampaignStatus;

  @Column({
    type: "enum",
    enum: EPromoCampaignTarget,
    name: "target",
  })
  target: EPromoCampaignTarget;

  @Column({
    type: "enum",
    enum: EPromoCampaignDuration,
    name: "duration",
  })
  duration: EPromoCampaignDuration;

  @Column({
    type: "enum",
    enum: EPromoCampaignApplication,
    name: "application",
  })
  application: EPromoCampaignApplication;

  @Column({
    type: "enum",
    enum: EAppointmentCommunicationType,
    name: "communication_types",
    array: true,
  })
  communicationTypes: EAppointmentCommunicationType[];

  @Column({
    type: "enum",
    enum: EAppointmentSchedulingType,
    name: "scheduling_types",
    array: true,
  })
  schedulingTypes: EAppointmentSchedulingType[];

  @Column({
    type: "enum",
    enum: EAppointmentTopic,
    name: "topics",
    array: true,
  })
  topics: EAppointmentTopic[];

  @Column({
    type: "enum",
    enum: EAppointmentInterpreterType,
    name: "interpreter_types",
    array: true,
  })
  interpreterTypes: EAppointmentInterpreterType[];

  @Column({
    type: "enum",
    enum: EAppointmentInterpretingType,
    name: "interpreting_types",
    array: true,
  })
  interpretingTypes: EAppointmentInterpretingType[];

  @Column({ type: "boolean", name: "banner_display" })
  bannerDisplay: boolean;

  @Column({ type: "varchar", name: "conditions_url", nullable: true })
  conditionsUrl: string | null;

  @OneToOne(() => PromoCampaignBanner, (promoCampaignBanner) => promoCampaignBanner.promoCampaign)
  banner: PromoCampaignBanner | null;

  @OneToMany(() => PromoCampaignAssignment, (promoCampaignAssignment) => promoCampaignAssignment.promoCampaign)
  promoCampaignAssignments: PromoCampaignAssignment[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
