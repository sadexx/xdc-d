import { UserRole } from "src/modules/users/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "custom_insurances" })
export class CustomInsurance {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "custom_insurances_PK" })
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.customInsurance, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "custom_insurances_user_roles_FK",
  })
  userRole: UserRole;

  @Column({ type: "varchar", name: "insured_party" })
  insuredParty: string;

  @Column({ type: "varchar", name: "insurance_company" })
  insuranceCompany: string;

  @Column({ type: "varchar", name: "policy_number" })
  policyNumber: string;

  @Column({ type: "int", name: "coverage_limit" })
  coverageLimit: number;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
