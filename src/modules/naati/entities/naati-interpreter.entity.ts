import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { INaatiAddress } from "src/modules/naati/common/interface";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { NaatiLanguagePair } from "src/modules/naati/entities";
import { EExtNaatiInterpreterType } from "src/modules/naati/common/enum";

@Entity("naati_interpreters")
export class NaatiInterpreter {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "naati_interpreters_PK" })
  id: string;

  @Column({ type: "varchar", name: "surname", nullable: true })
  surname: string | null;

  @Column({ type: "varchar", name: "given_name", nullable: true })
  givenName: string | null;

  @Column({ type: "varchar", name: "other_names", nullable: true })
  otherNames: string | null;

  @Column({ type: "varchar", name: "title", nullable: true })
  title: string | null;

  @Column({
    type: "enum",
    enum: EExtNaatiInterpreterType,
    name: "main_section_interpreter_type",
  })
  mainSectionInterpreterType: EExtNaatiInterpreterType;

  @Column({ type: "enum", enum: ELanguages, name: "main_section_language" })
  mainSectionLanguage: ELanguages;

  @Column({ type: "varchar", name: "phone", nullable: true })
  phone: string | null;

  @Column({ type: "varchar", name: "website_url", nullable: true })
  websiteUrl: string | null;

  @Column({ type: "varchar", name: "email", nullable: true })
  email: string | null;

  @Column({ type: "jsonb", name: "address", nullable: true })
  address: INaatiAddress | null;

  @OneToMany(() => NaatiLanguagePair, (naatiLanguagePair) => naatiLanguagePair.naatiInterpreter)
  languagePairs: NaatiLanguagePair[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
