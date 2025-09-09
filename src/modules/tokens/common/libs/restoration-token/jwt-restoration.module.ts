import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtRestorationService } from "src/modules/tokens/common/libs/restoration-token/jwt-restoration.service";

@Module({
  imports: [JwtModule],
  providers: [JwtRestorationService],
  exports: [JwtRestorationService],
})
export class JwtRestorationModule {}
