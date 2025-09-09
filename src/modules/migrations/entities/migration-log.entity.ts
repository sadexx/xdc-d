import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { MigrationType } from "src/modules/migrations/common/enum";

@Entity({ name: "migration_logs" })
@Index("migration_logs_migration_file_name_UQ", ["migrationFileName", "migrationType"], { unique: true })
export class MigrationLog {
  @PrimaryGeneratedColumn("increment", {
    name: "id",
    type: "integer",
    primaryKeyConstraintName: "migration_logs_PK",
  })
  id: number;

  @Column({ type: "varchar", name: "migration_file_name" })
  migrationFileName: string;

  @Column({ type: "varchar", name: "applied_by" })
  appliedBy: string;

  @Column({ type: "enum", enum: MigrationType, name: "migration_type" })
  migrationType: MigrationType;

  @Column({ type: "text", name: "sql_text" })
  sqlText: string;

  @Column({ type: "text", name: "notes", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;
}
