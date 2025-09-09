import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtRequiredInfoRefreshService } from "src/modules/tokens/common/libs/required-info-refresh-token/jwt-required-info-refresh.service";

@Module({
  imports: [JwtModule],
  providers: [JwtRequiredInfoRefreshService],
  exports: [JwtRequiredInfoRefreshService],
})
export class JwtRequiredInfoRefreshModule {}
