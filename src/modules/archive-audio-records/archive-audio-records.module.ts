import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { ArchiveAudioRecordsController } from "src/modules/archive-audio-records/controllers";
import { ArchiveAudioRecordService } from "src/modules/archive-audio-records/services";
import { EmailsModule } from "src/modules/emails/emails.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentAdminInfo]), AwsS3Module, EmailsModule, HelperModule],
  controllers: [ArchiveAudioRecordsController],
  providers: [ArchiveAudioRecordService],
  exports: [],
})
export class ArchiveAudioRecordsModule {}
