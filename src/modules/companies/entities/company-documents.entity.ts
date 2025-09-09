import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "src/modules/companies/entities";
import { ECompanyDocumentStatus } from "src/modules/companies/common/enums";

@Entity("company_documents")
export class CompanyDocument {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "company_documents_PK" })
  id: string;

  @Column({ type: "varchar", name: "type" })
  type: string;

  @Column({ type: "varchar", name: "s3_key" })
  s3Key: string;

  @Column({ type: "enum", enum: ECompanyDocumentStatus, name: "status", default: ECompanyDocumentStatus.PENDING })
  status: ECompanyDocumentStatus;

  @ManyToOne(() => Company, (company) => company.documents, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "company_documents_companies_FK",
  })
  company: Company;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
