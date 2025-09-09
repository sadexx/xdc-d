import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "src/modules/companies/entities/index";

@Entity("company_deposit_charges")
export class CompanyDepositCharge {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "company_deposit_charges_PK" })
  id: string;

  @OneToOne(() => Company, (company) => company.depositCharge, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "companies_company_deposit_charges_FK",
  })
  company: Company;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "deposit_charge_amount" })
  depositChargeAmount: number;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
