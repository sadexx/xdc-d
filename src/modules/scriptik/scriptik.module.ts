import { Module } from "@nestjs/common";
import { ScriptickController } from "src/modules/scriptik/controllers";
import { ScriptikService } from "src/modules/scriptik/services";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { AppointmentOrdersModule } from "src/modules/appointment-orders/appointment-order/appointment-orders.module";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";

@Module({
  imports: [AppointmentsModule, AppointmentOrdersModule, ChimeMeetingConfigurationModule],
  providers: [ScriptikService],
  controllers: [ScriptickController],
})
export class ScriptikModule {}
