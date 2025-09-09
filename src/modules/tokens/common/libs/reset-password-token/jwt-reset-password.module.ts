import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtResetPasswordService } from "src/modules/tokens/common/libs/reset-password-token/jwt-reset-password.service";

@Module({
  imports: [JwtModule],
  providers: [JwtResetPasswordService],
  exports: [JwtResetPasswordService],
})
export class JwtResetPasswordModule {}
