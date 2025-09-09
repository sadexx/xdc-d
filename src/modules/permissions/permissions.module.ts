import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Method } from "src/modules/permissions/entities";
import { PermissionsService } from "src/modules/permissions/services";
import { PermissionsController } from "src/modules/permissions/controllers";
import { Role } from "src/modules/users/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Method, Role])],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
