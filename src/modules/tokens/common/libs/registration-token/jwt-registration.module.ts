import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtRegistrationService } from "src/modules/tokens/common/libs/registration-token/jwt-registration.service";

@Module({
  imports: [JwtModule],
  providers: [JwtRegistrationService],
  exports: [JwtRegistrationService],
})
export class JwtRegistrationModule {}
