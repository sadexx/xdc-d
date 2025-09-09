import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";

@Entity("user_concession_cards")
export class UserConcessionCard {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "user_concession_cards_PK" })
  id: string;

  @Column({ type: "varchar", name: "centerlink_pensioner_concession_card_number", nullable: true })
  centerlinkPensionerConcessionCardNumber: string | null;

  @Column({ type: "varchar", name: "veteran_affairs_pensioner_concession_card_number", nullable: true })
  veteranAffairsPensionerConcessionCardNumber: string | null;

  @Column({
    type: "enum",
    enum: EUserConcessionCardStatus,
    default: EUserConcessionCardStatus.INITIALIZED,
  })
  status: EUserConcessionCardStatus;

  @OneToOne(() => UserRole, (userRole) => userRole.userConcessionCard, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "user_concession_cards_user_roles_FK",
  })
  userRole: UserRole;

  @OneToOne(() => UserDocument, (document) => document.userConcessionCard, { nullable: true })
  document: UserDocument | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
