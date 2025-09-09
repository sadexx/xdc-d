import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Blacklist } from "src/modules/blacklists/entities";
import { BlacklistsController } from "src/modules/blacklists/controllers";
import { BlacklistService } from "src/modules/blacklists/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [TypeOrmModule.forFeature([Blacklist, Appointment]), AccessControlModule],
  controllers: [BlacklistsController],
  providers: [BlacklistService],
  exports: [],
})
export class BlacklistModule {}
