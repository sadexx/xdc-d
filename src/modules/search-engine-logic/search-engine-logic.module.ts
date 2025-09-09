import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import {
  SearchEngineLogicService,
  SearchEngineNotificationService,
  SearchEngineOnDemandService,
  SearchEnginePreBookGroupService,
  SearchEnginePreBookOrderService,
  SearchEngineQueryOptionsService,
  SearchEngineStepService,
} from "src/modules/search-engine-logic/services";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterProfile, AppointmentAdminInfo, AppointmentOrder, AppointmentOrderGroup]),
    NotificationModule,
    HelperModule,
    EmailsModule,
  ],
  controllers: [],
  providers: [
    SearchEngineLogicService,
    SearchEngineOnDemandService,
    SearchEnginePreBookOrderService,
    SearchEnginePreBookGroupService,
    SearchEngineStepService,
    SearchEngineQueryOptionsService,
    SearchEngineNotificationService,
  ],
  exports: [SearchEngineLogicService],
})
export class SearchEngineLogicModule {}
