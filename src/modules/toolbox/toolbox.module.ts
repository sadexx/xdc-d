import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterpreterProfile, LanguagePair } from "src/modules/interpreters/profile/entities";
import { Company } from "src/modules/companies/entities";
import { ToolboxController } from "src/modules/toolbox/controllers";
import { ToolboxQueryOptionsService, ToolboxService } from "src/modules/toolbox/services";
import { User } from "src/modules/users/entities";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Notification } from "src/modules/notifications/entities";
import { UserRole } from "src/modules/users/entities";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LanguagePair,
      Company,
      User,
      AppointmentOrder,
      ChannelMembership,
      Appointment,
      InterpreterProfile,
      Notification,
      UserRole,
    ]),
    RedisModule,
  ],
  controllers: [ToolboxController],
  providers: [ToolboxService, ToolboxQueryOptionsService],
  exports: [ToolboxService],
})
export class ToolboxModule {}
