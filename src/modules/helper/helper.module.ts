import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HelperService } from "src/modules/helper/services";
import { UserRole } from "src/modules/users/entities";
import { User } from "src/modules/users/entities";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole])],
  providers: [HelperService],
  exports: [HelperService],
})
export class HelperModule {}
