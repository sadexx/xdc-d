import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("app_instance_configs")
export class AppInstanceConfig {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "app_instance_configs_PK" })
  id: string;

  @Column({ type: "varchar", name: "name", nullable: false })
  name: string;

  @Column({ type: "varchar", name: "app_instance_arn", nullable: false })
  appInstanceArn: string;

  @Column({ type: "varchar", name: "admin_arn", nullable: false })
  adminArn: string;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
