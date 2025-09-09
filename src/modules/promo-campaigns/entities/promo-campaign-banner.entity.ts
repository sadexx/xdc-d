import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";

@Entity({ name: "promo_campaign_banners" })
export class PromoCampaignBanner {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "promo_campaign_banners_PK" })
  id: string;

  @Column({ type: "varchar", name: "mobile_banner_url", nullable: true })
  mobileBannerUrl: string | null;

  @Column({ type: "varchar", name: "tablet_banner_url", nullable: true })
  tabletBannerUrl: string | null;

  @Column({ type: "varchar", name: "web_banner_url", nullable: true })
  webBannerUrl: string | null;

  @OneToOne(() => PromoCampaign, (promoCampaignBanner) => promoCampaignBanner.banner, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "promo_campaign_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "promo_campaign_banners_promo_campaigns_FK",
  })
  promoCampaign: PromoCampaign | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
