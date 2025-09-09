import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtActivationAccessService } from "src/modules/tokens/common/libs/activation-access-token/jwt-activation-access.service";

@Module({
  imports: [JwtModule],
  providers: [JwtActivationAccessService],
  exports: [JwtActivationAccessService],
})
export class JwtActivationAccessModule {}
