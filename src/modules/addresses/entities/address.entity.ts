import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
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

@Entity({ name: "addresses" })
export class Address {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "addresses_PK" })
  id: string;

  @Column({ type: "double precision", name: "latitude" })
  latitude: number;

  @Column({ type: "double precision", name: "longitude" })
  longitude: number;

  @Column({ type: "varchar", name: "organization_name", nullable: true })
  organizationName: string | null;

  @Column({ type: "varchar", name: "country" })
  country: string;

  @Column({ type: "varchar", name: "state" })
  state: string;

  @Column({ type: "varchar", name: "suburb" })
  suburb: string;

  @Column({ type: "varchar", name: "street_name", nullable: true })
  streetName: string | null;

  @Column({ type: "varchar", name: "street_number", nullable: true })
  streetNumber: string | null;

  @Column({ type: "varchar", name: "postcode", nullable: true })
  postcode: string | null;

  @Column({ type: "varchar", name: "building", nullable: true })
  building: string | null;

  @Column({ type: "varchar", name: "unit", nullable: true })
  unit: string | null;

  @Column({ type: "varchar", name: "timezone" })
  timezone: string;

  @OneToOne(() => UserRole, (userRole) => userRole.address, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "addresses_user_roles_FK",
  })
  userRole: UserRole | null;

  @OneToOne(() => Company, (company) => company.address, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id", referencedColumnName: "id", foreignKeyConstraintName: "addresses_companies_FK" })
  company: Company | null;

  @OneToOne(() => Appointment, (appointment) => appointment.address, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "addresses_appointments_FK",
  })
  appointment: Appointment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
