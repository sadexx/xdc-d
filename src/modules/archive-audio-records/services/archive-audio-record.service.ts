import { ListObjectsV2CommandOutput, ObjectStorageClass } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { addDays, format } from "date-fns";
import { NUMBER_OF_DAYS_IN_TWO_DAYS, NUMBER_OF_DAYS_IN_WEEK } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { IMessageOutput } from "src/common/outputs";
import { findOneOrFail } from "src/common/utils";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";
import { HelperService } from "src/modules/helper/services";
import { FindOneOptions, Repository } from "typeorm";
import { EArchiveAudioRecordsErrorCodes } from "src/modules/archive-audio-records/common/enums";

@Injectable()
export class ArchiveAudioRecordService {
  private readonly lokiLogger = new LokiLogger(ArchiveAudioRecordService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
    private readonly emailsService: EmailsService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getAudioRecordingForAppointment(id: string): Promise<IMessageOutput | string> {
    const queryOptions: FindOneOptions<AppointmentAdminInfo> = {
      select: {
        id: true,
        callRecordingS3Key: true,
        deepArchiveRestoreExpirationDate: true,
        appointment: {
          id: true,
          platformId: true,
        },
      },
      where: { id: id, appointment: { status: EAppointmentStatus.COMPLETED } },
      relations: { appointment: true },
    };
    const appointmentAdminInfo = await findOneOrFail(id, this.appointmentAdminInfoRepository, queryOptions);

    if (!appointmentAdminInfo.callRecordingS3Key) {
      this.lokiLogger.error(`Recording key is not found in Appointment Admin Info with id: ${id}.`);
      throw new NotFoundException(EArchiveAudioRecordsErrorCodes.RECORDING_KEY_NOT_FOUND);
    }

    if (
      appointmentAdminInfo.deepArchiveRestoreExpirationDate &&
      appointmentAdminInfo.deepArchiveRestoreExpirationDate > new Date()
    ) {
      throw new BadRequestException({
        message: EArchiveAudioRecordsErrorCodes.FILE_RESTORE_IN_PROGRESS,
        variables: { expirationDate: appointmentAdminInfo.deepArchiveRestoreExpirationDate.toISOString() },
      });
    }

    const listResponse = await this.awsS3Service.getAudioKeyInFolder(appointmentAdminInfo.callRecordingS3Key);
    const response = await this.determineStorageClassForAudioRecording(
      appointmentAdminInfo,
      listResponse,
      appointmentAdminInfo.callRecordingS3Key,
    );

    return response;
  }

  private async determineStorageClassForAudioRecording(
    appointmentAdminInfo: AppointmentAdminInfo,
    listResponse: ListObjectsV2CommandOutput,
    folderPath: string,
  ): Promise<IMessageOutput | string> {
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      this.lokiLogger.error(`File key is undefined for: ${folderPath}.`);
      throw new NotFoundException(EArchiveAudioRecordsErrorCodes.FILE_KEY_UNDEFINED);
    }

    const [file] = listResponse.Contents;

    if (!file.Key || listResponse.Contents.length > 1) {
      this.lokiLogger.error(
        `Issue with the number of files found for this Appointment Admin Info: ${appointmentAdminInfo.id}.`,
      );
      throw new NotFoundException(EArchiveAudioRecordsErrorCodes.FILE_COUNT_ISSUE);
    }

    if (file.StorageClass === ObjectStorageClass.DEEP_ARCHIVE) {
      this.scheduleRestoreAndNotifyAdmin(file.Key, folderPath, appointmentAdminInfo).catch((err: Error) => {
        this.lokiLogger.error(`Error restoring audio recording: ${err.message}. Folder path: ${folderPath}`, err.stack);
      });

      return {
        message:
          "Requested file has been moved to a deep archive." +
          " Please wait for an e-mail while the file is restored. " +
          " Typically, this process takes within 48 hours.",
      };
    }

    return await this.awsS3Service.getShortLivedSignedUrl(file.Key);
  }

  private async scheduleRestoreAndNotifyAdmin(
    fileKey: string,
    folderPath: string,
    appointmentAdminInfo: AppointmentAdminInfo,
  ): Promise<void> {
    const dateToday = new Date();
    const dateAccess = addDays(dateToday, NUMBER_OF_DAYS_IN_TWO_DAYS);
    const dateExpiration = addDays(dateToday, NUMBER_OF_DAYS_IN_WEEK);
    await this.restoreAudioRecordingFromDeepArchive(fileKey);
    const signedUrl = await this.awsS3Service.getMaxLivedSignedUrl(fileKey);

    await this.appointmentAdminInfoRepository.update(appointmentAdminInfo.id, {
      deepArchiveRestoreExpirationDate: dateExpiration,
    });

    await this.sendEmailsToAdminsInBackground(
      appointmentAdminInfo.appointment,
      signedUrl,
      dateAccess,
      dateExpiration,
    ).catch((error: Error) => {
      this.lokiLogger.error(
        `Error sending emails to admins: ${error.message}. Folder path: ${folderPath}`,
        error.stack,
      );
    });
  }

  private async restoreAudioRecordingFromDeepArchive(fileKey: string): Promise<void> {
    const STANDARD_ACCESS_DAYS: number = 7;
    await this.awsS3Service.restoreObjectFromDeepArchive(fileKey, STANDARD_ACCESS_DAYS);
  }

  private async sendEmailsToAdminsInBackground(
    appointment: Appointment,
    signedUrl: string,
    dateAccess: Date,
    dateExpiration: Date,
  ): Promise<void> {
    const formattedDateAccess = await this.formatDate(dateAccess);
    const formattedDateExpiration = await this.formatDate(dateExpiration);
    const appointmentUrlLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentId":"${appointment.id}"}`;
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendAudioRecordUrlNotifyToAdmin(
        superAdmin.email,
        appointmentUrlLink,
        signedUrl,
        formattedDateAccess,
        formattedDateExpiration,
      );
    }
  }

  private async formatDate(date: Date): Promise<string> {
    return format(date, "EEEE, MMMM do, yyyy 'at' h:mm a");
  }
}
