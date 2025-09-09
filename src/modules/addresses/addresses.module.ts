import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Address } from "src/modules/addresses/entities";
import { AddressesService } from "src/modules/addresses/services";
import { AddressesController } from "src/modules/addresses/controllers";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [TypeOrmModule.forFeature([Address]), AppointmentsModule, AppointmentsSharedModule, AccessControlModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [],
})
export class AddressesModule {}
