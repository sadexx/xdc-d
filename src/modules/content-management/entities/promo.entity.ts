import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ContentManagement } from "src/modules/content-management/entities";
import { EPromoAndReviewOrder } from "src/modules/content-management/common/enums";

@Entity({ name: "promos" })
export class Promo {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "promos_PK" })
  id: string;

  @ManyToOne(() => ContentManagement, (contentManagement) => contentManagement.promotions, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "content_management_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "promos_content_managements_FK",
  })
  contentManagement: ContentManagement;

  @Column({ type: "varchar", name: "title" })
  title: string;

  @Column({ type: "varchar", name: "description" })
  description: string;

  @Column({ type: "varchar", name: "image", nullable: true })
  image: string | null;

  @Column({ type: "integer", name: "ordinal_number" })
  ordinalNumber: EPromoAndReviewOrder;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
