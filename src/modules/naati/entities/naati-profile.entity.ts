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
import { INaatiCertifiedLanguages } from "src/modules/naati/common/interface";

@Entity({ name: "naati_profiles" })
export class NaatiProfile {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "naati_profiles_PK" })
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.naatiProfile, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "naati_profiles_user_roles_FK",
  })
  userRole: UserRole;

  @Column({ type: "varchar", name: "practitioner_cpn", nullable: true })
  practitionerCpn: string | null;

  @Column({ type: "varchar", name: "given_name", nullable: true })
  givenName: string | null;

  @Column({ type: "varchar", name: "family_name", nullable: true })
  familyName: string | null;

  @Column({ type: "varchar", name: "country", nullable: true })
  country: string | null;

  @Column({ type: "jsonb", name: "certified_languages", nullable: true })
  certifiedLanguages: INaatiCertifiedLanguages[] | null;

  @Column({ type: "text", name: "message", nullable: true })
  message: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
