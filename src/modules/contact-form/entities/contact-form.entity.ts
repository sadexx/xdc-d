import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("contact_forms")
export class ContactForm {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "contact_forms_PK" })
  id: string;

  @Column({ type: "varchar", name: "email" })
  email: string;

  @Column({ type: "varchar", name: "user_name", nullable: true })
  userName: string | null;

  @Column({ type: "varchar", name: "message", nullable: true })
  message: string | null;

  @Column({ type: "boolean", name: "is_viewed", default: false })
  isViewed: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
