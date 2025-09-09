import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtRefreshService } from "src/modules/tokens/common/libs/refresh-token/jwt-refresh.service";

@Module({
  imports: [JwtModule],
  providers: [JwtRefreshService],
  exports: [JwtRefreshService],
})
export class JwtRefreshModule {}
