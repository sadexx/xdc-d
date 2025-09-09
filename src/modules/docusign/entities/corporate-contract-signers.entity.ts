import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "src/modules/companies/entities";
import { EUserTitle } from "src/modules/users/common/enums";

@Entity("corporate_contract_signers")
export class CorporateContractSigners {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "corporate_contract_signers_PK" })
  id: string;

  @Column({ type: "varchar", name: "main_signer_contact_email" })
  mainSignerContactEmail: string;

  @Column({
    type: "enum",
    enum: EUserTitle,
    name: "main_signer_title",
    nullable: true,
  })
  mainSignerTitle: EUserTitle | null;

  @Column({ type: "varchar", name: "main_signer_first_name" })
  mainSignerFirstName: string;

  @Column({ type: "varchar", name: "main_signer_middle_name", nullable: true })
  mainSignerMiddleName: string | null;

  @Column({ type: "varchar", name: "main_signer_last_name" })
  mainSignerLastName: string;

  @Column({ type: "varchar", name: "second_signer_contact_email", nullable: true })
  secondSignerContactEmail: string | null;

  @Column({
    type: "enum",
    enum: EUserTitle,
    name: "second_signer_title",
    nullable: true,
  })
  secondSignerTitle: EUserTitle | null;

  @Column({ type: "varchar", name: "second_signer_first_name", nullable: true })
  secondSignerFirstName: string | null;

  @Column({ type: "varchar", name: "second_signer_middle_name", nullable: true })
  secondSignerMiddleName: string | null;

  @Column({ type: "varchar", name: "second_signer_last_name", nullable: true })
  secondSignerLastName: string | null;

  @OneToOne(() => Company, (company) => company.contractSigners, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "corporate_contract_signers_companies_FK",
  })
  company: Company;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
