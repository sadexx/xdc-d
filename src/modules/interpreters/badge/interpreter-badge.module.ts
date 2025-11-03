import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { InterpreterBadgeController } from "src/modules/interpreters/badge/controllers";
import { UserRole } from "src/modules/users/entities";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [TypeOrmModule.forFeature([InterpreterProfile, UserRole]), AwsS3Module, QueueModule],
  controllers: [InterpreterBadgeController],
  providers: [InterpreterBadgeService],
  exports: [InterpreterBadgeService],
})
export class InterpreterBadgeModule {}
