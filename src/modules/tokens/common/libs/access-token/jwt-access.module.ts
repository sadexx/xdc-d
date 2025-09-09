import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token/jwt-access.service";

@Module({
  imports: [JwtModule],
  providers: [JwtAccessService],
  exports: [JwtAccessService],
})
export class JwtAccessModule {}
