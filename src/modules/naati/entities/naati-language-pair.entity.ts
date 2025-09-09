import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { NaatiInterpreter } from "src/modules/naati/entities";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

@Entity("naati_language_pairs")
export class NaatiLanguagePair {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "naati_language_pairs_PK" })
  id: string;

  @ManyToOne(() => NaatiInterpreter, (naatiInterpreter) => naatiInterpreter.languagePairs, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "naati_interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "naati_language_pairs_naati_interpreters_FK",
  })
  naatiInterpreter: NaatiInterpreter;

  @Column({ type: "enum", enum: EExtInterpreterLevel, name: "interpreter_level" })
  interpreterLevel: EExtInterpreterLevel;

  @Column({ type: "enum", enum: ELanguages, name: "language_from" })
  languageFrom: ELanguages;

  @Column({ type: "enum", enum: ELanguages, name: "language_to" })
  languageTo: ELanguages;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
