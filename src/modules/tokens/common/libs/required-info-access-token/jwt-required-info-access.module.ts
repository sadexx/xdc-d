import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtRequiredInfoAccessService } from "src/modules/tokens/common/libs/required-info-access-token/jwt-required-info-access.service";

@Module({
  imports: [JwtModule],
  providers: [JwtRequiredInfoAccessService],
  exports: [JwtRequiredInfoAccessService],
})
export class JwtRequiredInfoAccessModule {}
