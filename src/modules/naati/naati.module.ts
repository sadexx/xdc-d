import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NaatiInterpreter, NaatiLanguagePair, NaatiProfile } from "src/modules/naati/entities";
import { NaatiQueryOptionsService, NaatiService, NaatiWebScraperService } from "src/modules/naati/services";
import { NaatiController } from "src/modules/naati/controllers";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { MockModule } from "src/modules/mock/mock.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { HttpClientModule } from "src/modules/http-client/http-client.module";
import { UserRole } from "src/modules/users/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([NaatiInterpreter, NaatiLanguagePair, NaatiProfile, UserRole]),
    InterpreterProfileModule,
    MockModule,
    ActivationTrackingModule,
    EmailsModule,
    HelperModule,
    HttpClientModule,
    AccessControlModule,
  ],
  providers: [NaatiService, NaatiWebScraperService, NaatiQueryOptionsService],
  controllers: [NaatiController],
  exports: [],
})
export class NaatiModule {}
