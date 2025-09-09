import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities/appointment-order.entity";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";
import { ERepeatInterval } from "src/modules/appointment-orders/appointment-order/common/enum";

@Entity({ name: "appointment_order_groups" })
export class AppointmentOrderGroup {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "appointment_order_groups_PK" })
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    unique: true,
  })
  platformId: string;

  @OneToMany(() => AppointmentOrder, (appointment) => appointment.appointmentOrderGroup)
  appointmentOrders: AppointmentOrder[];

  @Column({ type: "boolean", name: "same_interpreter" })
  sameInterpreter: boolean;

  @Column({ type: "uuid", name: "matched_interpreter_ids", array: true, default: [] })
  matchedInterpreterIds: string[];

  @Column({ type: "uuid", name: "rejected_interpreter_ids", array: true, default: [] })
  rejectedInterpreterIds: string[];

  @Column({ type: "timestamptz", name: "next_repeat_time", nullable: true })
  nextRepeatTime: Date | null;

  @Column({
    type: "enum",
    enum: ERepeatInterval,
    name: "repeat_interval",
    nullable: true,
  })
  repeatInterval: ERepeatInterval | null;

  @Column({ type: "int", name: "remaining_repeats", nullable: true })
  remainingRepeats: number | null;

  @Column({ type: "timestamptz", name: "notify_admin", nullable: true })
  notifyAdmin: Date | null;

  @Column({ type: "timestamptz", name: "end_search_time", nullable: true })
  endSearchTime: Date | null;

  @Column({ type: "varchar", name: "operated_by_company_name" })
  operatedByCompanyName: string;

  @Column({ type: "uuid", name: "operated_by_company_id" })
  operatedByCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_main_corporate_company_name", nullable: true })
  operatedByMainCorporateCompanyName: string | null;

  @Column({ type: "uuid", name: "operated_by_main_corporate_company_id", nullable: true })
  operatedByMainCorporateCompanyId: string | null;

  @Column({ type: "timestamptz", name: "time_to_restart", nullable: true })
  timeToRestart: Date | null;

  @Column({ type: "boolean", name: "is_first_search_completed", default: false })
  isFirstSearchCompleted: boolean;

  @Column({ type: "boolean", name: "is_second_search_completed", default: false })
  isSecondSearchCompleted: boolean;

  @Column({ type: "boolean", name: "is_search_needed", default: false })
  isSearchNeeded: boolean;

  @Column({ type: "boolean", name: "is_company_has_interpreters" })
  isCompanyHasInterpreters: boolean;

  @Column({ type: "boolean", name: "accept_overtime_rates" })
  acceptOvertimeRates: boolean;

  @Column({ type: "varchar", name: "timezone" })
  timezone: string;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    this.platformId = await setPlatformId(ESequenceName.APPOINTMENT_ORDER_GROUP);
  }
}
