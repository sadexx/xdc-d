import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { EInterpreterExperienceYears } from "src/modules/interpreters/questionnaire/common/enum";
import { InterpreterRecommendation } from "src/modules/interpreters/questionnaire/entities";

@Entity("interpreter_questionnaires")
export class InterpreterQuestionnaire {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "interpreter_questionnaires_PK" })
  id: string;

  @Column({
    type: "enum",
    enum: EInterpreterExperienceYears,
    name: "interpreter_experience_years",
    nullable: true,
  })
  experienceYears: EInterpreterExperienceYears | null;

  @OneToOne(() => UserRole, (userRole) => userRole.questionnaire, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "interpreter_questionnaires_user_roles_FK",
  })
  userRole: UserRole;

  @Column({ name: "user_role_id", nullable: false })
  @RelationId((interpreterQuestionnaire: InterpreterQuestionnaire) => interpreterQuestionnaire.userRole)
  userRoleId: string;

  @OneToMany(() => InterpreterRecommendation, (interpreterRecommendations) => interpreterRecommendations.questionnaire)
  recommendations: InterpreterRecommendation[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
