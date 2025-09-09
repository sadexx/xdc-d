import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { InterpreterQuestionnaire } from "src/modules/interpreters/questionnaire/entities";

@Entity("interpreter_recommendations")
export class InterpreterRecommendation {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "interpreter_recommendations_PK" })
  id: string;

  @Column({ type: "varchar", name: "company_name" })
  companyName: string;

  @Column({ type: "varchar", name: "recommender_full_name" })
  recommenderFullName: string;

  @Column({ type: "varchar", name: "recommender_phone_number", nullable: true })
  recommenderPhoneNumber: string | null;

  @Column({ type: "varchar", name: "recommender_email", nullable: true })
  recommenderEmail: string | null;

  @Column({ type: "uuid", name: "questionnaire_id", nullable: false })
  @RelationId((recommendation: InterpreterRecommendation) => recommendation.questionnaire)
  questionnaireId: string;

  @ManyToOne(() => InterpreterQuestionnaire, (questionnaire) => questionnaire.recommendations, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "questionnaire_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "interpreter_recommendations_interpreter_questionnaires_FK",
  })
  questionnaire: InterpreterQuestionnaire;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
