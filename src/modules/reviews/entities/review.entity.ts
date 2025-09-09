import { EPromoAndReviewOrder } from "src/modules/content-management/common/enums";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("reviews")
export class Review {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "reviews_PK" })
  id: string;

  @Column({ type: "varchar", name: "user_name" })
  userName: string;

  @Column({ type: "varchar", name: "review" })
  review: string;

  @Column({ type: "varchar", name: "avatar", nullable: true })
  avatar: string | null;

  @Column({ type: "integer", name: "rating" })
  rating: number;

  @Column({ type: "integer", name: "ordinal_number" })
  ordinalNumber: EPromoAndReviewOrder;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
