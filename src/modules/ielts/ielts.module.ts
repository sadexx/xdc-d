import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IeltsSdkService, IeltsService } from "src/modules/ielts/services";
import { IeltsController } from "src/modules/ielts/controllers";
import { IeltsCheck } from "src/modules/ielts/entities";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { MockModule } from "src/modules/mock/mock.module";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { UserRole } from "src/modules/users/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([IeltsCheck, InterpreterProfile, UserRole]),
    ActivationTrackingModule,
    InterpreterProfileModule,
    MockModule,
    InterpreterBadgeModule,
    EmailsModule,
    AccessControlModule,
  ],
  providers: [IeltsService, IeltsSdkService],
  controllers: [IeltsController],
})
export class IeltsModule {}
