import { Module } from "@nestjs/common";
import { MockService } from "src/modules/mock/services";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BackyCheck } from "src/modules/backy-check/entities";
import { DocusignContract } from "src/modules/docusign/entities";
import { UserRole } from "src/modules/users/entities";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [TypeOrmModule.forFeature([BackyCheck, DocusignContract, UserRole]), TokensModule, RedisModule],
  providers: [MockService],
  exports: [MockService],
})
export class MockModule {}
