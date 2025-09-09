import { CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";

@Entity({ name: "discount_holders" })
export class DiscountHolder {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "discount_holders_PK" })
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.discountHolder, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_user_roles_FK",
  })
  userRole: UserRole | null;

  @OneToOne(() => Company, (company) => company.discountHolder, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_companies_FK",
  })
  company: Company | null;

  @OneToOne(() => PromoCampaignAssignment, (promoCampaignAssignment) => promoCampaignAssignment.discountHolder, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "promo_campaign_assignment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_promo_campaign_assignments_FK",
  })
  promoCampaignAssignment: PromoCampaignAssignment | null;

  @OneToOne(() => MembershipAssignment, (membershipAssignment) => membershipAssignment.discountHolder, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "membership_assignment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_membership_assignments_FK",
  })
  membershipAssignment: MembershipAssignment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
