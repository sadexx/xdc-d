import { Exclude } from "class-transformer";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("settings")
export class Setting {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "settings_PK" })
  @Exclude()
  id: string;

  @Column({ type: "int", name: "cancel_on_demand_grace_period_seconds" })
  cancelOnDemandGracePeriodSeconds: number;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
