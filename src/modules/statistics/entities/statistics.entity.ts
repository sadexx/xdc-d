import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import {
  EAppointmentType,
  EChartLine,
  EInterpreterAppointmentCriteria,
  EStatisticType,
} from "src/modules/statistics/common/enums";
import { EMembershipType } from "src/modules/memberships/common/enums";

@Entity("statistics")
export class Statistic {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "statistics_PK" })
  id: string;

  @Column({ type: "enum", enum: EChartLine, name: "chart_line" })
  chartLine: EChartLine;

  @Column({ type: "int", name: "value" })
  value: number;

  @Column({ type: "varchar", name: "user_role_name", nullable: true })
  userRoleName: string | null;

  @Column({ type: "timestamptz", name: "date" })
  date: Date;

  @Column({
    type: "enum",
    enum: EInterpreterAppointmentCriteria,
    name: "interpreter_appointment_criteria",
    nullable: true,
  })
  interpreterAppointmentCriteria: EInterpreterAppointmentCriteria | null;

  @Column({
    type: "enum",
    enum: EAppointmentType,
    name: "appointment_type_criteria",
    nullable: true,
  })
  appointmentTypeCriteria: EAppointmentType | null;

  @Column({
    type: "varchar",
    name: "interpreting_type_criteria",
    nullable: true,
  })
  interpretingTypeCriteria: string | null;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "membership_type_criteria",
    nullable: true,
  })
  membershipTypeCriteria: EMembershipType | null;

  @Column({
    type: "enum",
    enum: EStatisticType,
    name: "statistic_type",
  })
  statisticType: EStatisticType;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
