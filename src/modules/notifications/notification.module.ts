import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "src/modules/notifications/entities";
import { NotificationController } from "src/modules/notifications/controllers";
import { NotificationDeliveryService, NotificationService } from "src/modules/notifications/services";
import { AwsPinpointModule } from "src/modules/aws/pinpoint/aws-pinpoint.module";
import { Session } from "src/modules/sessions/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Session]), AwsPinpointModule],
  providers: [NotificationService, NotificationDeliveryService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
