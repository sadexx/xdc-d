import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtEmailConfirmationService } from "src/modules/tokens/common/libs/email-confirmation-token/jwt-email-confirmation.service";

@Module({
  imports: [JwtModule],
  providers: [JwtEmailConfirmationService],
  exports: [JwtEmailConfirmationService],
})
export class JwtEmailConfirmationModule {}
