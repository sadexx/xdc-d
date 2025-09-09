import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from "typeorm";
import { DiscountHolder } from "src/modules/discounts/entities";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";

@Entity({ name: "promo_campaign_assignments" })
export class PromoCampaignAssignment {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "promo_campaign_assignments_PK" })
  id: string;

  @Column({ type: "integer", name: "discount" })
  discount: number;

  @Column({ type: "integer", name: "discount_minutes", nullable: true })
  discountMinutes: number | null;

  @Column({ type: "integer", name: "remaining_uses", nullable: true })
  remainingUses: number | null;

  @Column({ type: "timestamptz", name: "last_used_date", nullable: true })
  lastUsedDate: Date | null;

  @ManyToOne(() => PromoCampaign, (promoCampaign) => promoCampaign.promoCampaignAssignments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "promo_campaign_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "promo_campaign_assignments_promo_campaigns_FK",
  })
  promoCampaign: PromoCampaign;

  @OneToOne(() => DiscountHolder, (discountHolder) => discountHolder.promoCampaignAssignment)
  discountHolder: DiscountHolder;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
