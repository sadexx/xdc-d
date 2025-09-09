import { EExtAbnStatus, EGstPayer } from "src/modules/abn/common/enums";
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
import { Company } from "src/modules/companies/entities";

@Entity("abn_checks")
export class AbnCheck {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "abn_checks_PK" })
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.abnCheck, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "abn_checks_user_roles_FK",
  })
  userRole: UserRole | null;

  @OneToOne(() => Company, (company) => company.abnCheck, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "company_id", referencedColumnName: "id", foreignKeyConstraintName: "abn_checks_companies_FK" })
  company: Company | null;

  @Column({ type: "varchar", name: "abn_number", nullable: true })
  abnNumber: string | null;

  @Column({ type: "enum", enum: EExtAbnStatus, name: "abn_status", nullable: true })
  abnStatus: EExtAbnStatus | null;

  @Column({ type: "date", name: "abn_status_effective_from", nullable: true })
  abnStatusEffectiveFrom: string | null;

  @Column({ type: "varchar", name: "acn", nullable: true })
  acn: string | null;

  @Column({ type: "date", name: "address_date", nullable: true })
  addressDate: string | null;

  @Column({ type: "varchar", name: "address_postcode", nullable: true })
  addressPostcode: string | null;

  @Column({ type: "varchar", name: "address_state", nullable: true })
  addressState: string | null;

  @Column({ type: "text", array: true, nullable: true })
  businessName: string[] | null;

  @Column({ type: "varchar", name: "full_name", nullable: true })
  fullName: string | null;

  @Column({ type: "varchar", name: "type_code", nullable: true })
  typeCode: string | null;

  @Column({ type: "varchar", name: "type_name", nullable: true })
  typeName: string | null;

  @Column({ type: "varchar", name: "gst", nullable: true })
  gst: string | null;

  @Column({ type: "enum", enum: EGstPayer, name: "gst_from_client", nullable: true })
  gstFromClient: EGstPayer | null;

  @Column({ type: "text", name: "message", nullable: true })
  message: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
