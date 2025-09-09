import { Module } from "@nestjs/common";
import { MockService } from "src/modules/mock/services";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BackyCheck } from "src/modules/backy-check/entities";
import { DocusignContract } from "src/modules/docusign/entities";
import { UserRole } from "src/modules/users/entities";
import { TokensModule } from "src/modules/tokens/tokens.module";

@Module({
  imports: [TypeOrmModule.forFeature([BackyCheck, DocusignContract, UserRole]), TokensModule],
  providers: [MockService],
  exports: [MockService],
})
export class MockModule {}
