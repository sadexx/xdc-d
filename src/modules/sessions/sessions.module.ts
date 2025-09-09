import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionsService } from "src/modules/sessions/services";
import { Session } from "src/modules/sessions/entities";
import { TokensModule } from "src/modules/tokens/tokens.module";

@Module({
  imports: [TypeOrmModule.forFeature([Session]), TokensModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
