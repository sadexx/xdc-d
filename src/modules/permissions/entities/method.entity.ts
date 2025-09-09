import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "src/modules/users/entities";

@Entity("methods")
export class Method {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "methods_PK" })
  id: string;

  @Column({ type: "varchar", name: "method_type" })
  methodType: string;

  @Column({ type: "varchar", name: "module" })
  module: string;

  @Column({ type: "varchar", name: "path" })
  path: string;

  @Column({ type: "varchar", name: "description" })
  description: string;

  @Column({ type: "boolean", name: "is_allowed" })
  isAllowed: boolean;

  @Column({ type: "boolean", name: "is_editable" })
  isEditable: boolean;

  @Column({ type: "boolean", name: "is_edited", default: false })
  isEdited: boolean;

  @ManyToOne(() => Role, (role) => role.methods, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id", referencedColumnName: "id", foreignKeyConstraintName: "methods_roles_FK" })
  role: Role;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
