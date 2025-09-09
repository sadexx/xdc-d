import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";

@Entity({ name: "interpreter_cancellation_records" })
export class InterpreterCancellationRecord {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "interpreter_cancellation_records_PK" })
  id: string;

  @OneToOne(() => InterpreterProfile, (profile) => profile.cancellationRecord, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "interpreter_profile_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "interpreter_cancellation_records_interpreter_profiles_FK",
  })
  interpreterProfile: InterpreterProfile;

  @Column({ type: "integer", name: "short_notice_cancellations_count" })
  shortNoticeCancellationsCount: number;

  @Column({ type: "timestamptz", name: "first_cancellation_date", nullable: true })
  firstCancellationDate: Date | null;

  @Column({ type: "timestamptz", name: "lock_start_date", nullable: true })
  lockStartDate: Date | null;

  @Column({ type: "timestamptz", name: "lock_end_date", nullable: true })
  lockEndDate: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
