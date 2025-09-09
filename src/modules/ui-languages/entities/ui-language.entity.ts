import { EPossibleUiLanguage } from "src/modules/ui-languages/common/enums";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";

@Entity("ui_languages")
export class UiLanguage {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "ui_languages_PK" })
  id: string;

  @Column({ type: "enum", enum: EPossibleUiLanguage, name: "language", unique: true })
  language: EPossibleUiLanguage;

  @Column({ type: "varchar", name: "file", nullable: true })
  file: string | null;

  @VersionColumn({ type: "int", name: "version" })
  version: number;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
