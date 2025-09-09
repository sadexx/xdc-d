import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtActivationRefreshService } from "src/modules/tokens/common/libs/activation-refresh-token/jwt-activation-refresh.service";

@Module({
  imports: [JwtModule],
  providers: [JwtActivationRefreshService],
  exports: [JwtActivationRefreshService],
})
export class JwtActivationRefreshModule {}
