import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlService } from "src/modules/access-control/services";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Company])],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
