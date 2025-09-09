import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE, NUMBER_OF_MINUTES_IN_FIVE_MINUTES } from "src/common/constants";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentCancelService } from "src/modules/appointments/appointment/services";
import {
  AppointmentNotificationService,
  AppointmentQueryOptionsService,
} from "src/modules/appointments/shared/services";
import { LokiLogger } from "src/common/logger";
import { ConfigService } from "@nestjs/config";
import { TAppointmentsWithoutClientVisit, TCancelAppointment } from "src/modules/appointments/appointment/common/types";
import { findManyTyped } from "src/common/utils";
import { QueueInitializeService } from "src/modules/queues/services";

export class AppointmentSchedulerService {
  private readonly lokiLogger = new LokiLogger(AppointmentSchedulerService.name);
  private readonly INACTIVITY_THRESHOLD_MINUTES: number = 4;
  private readonly ACTIVATION_WINDOW_MINUTES: number = 5;
  private readonly ACTIVATION_WINDOW_MS: number = this.ACTIVATION_WINDOW_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;
  private readonly INACTIVITY_THRESHOLD_MS = this.INACTIVITY_THRESHOLD_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;
  private readonly BACK_END_URL: string;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly appointmentCancelService: AppointmentCancelService,
    private readonly configService: ConfigService,
    private readonly queueManagementService: QueueInitializeService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  public async activateUpcomingAppointments(): Promise<void> {
    const currentTime = new Date();
    currentTime.setSeconds(0, 0);
    const activationThresholdEnd = new Date(currentTime.getTime() + this.ACTIVATION_WINDOW_MS);
    activationThresholdEnd.setSeconds(0, 0);

    const queryOptions = this.appointmentQueryOptionsService.getActivateUpcomingAppointmentsOptions(
      currentTime,
      activationThresholdEnd,
    );
    const updateResult = await this.appointmentRepository.update(queryOptions, {
      status: EAppointmentStatus.LIVE,
    });

    if (updateResult.affected && updateResult.affected > 0) {
      this.lokiLogger.log(`Activated ${updateResult.affected} upcoming appointments.`);
    }
  }

  public async closeInactiveOrPaymentFailedLiveAppointments(): Promise<void> {
    const currentTime = new Date();
    currentTime.setSeconds(0, 0);
    const thresholdTime = new Date(currentTime.getTime() - this.INACTIVITY_THRESHOLD_MS);
    thresholdTime.setSeconds(0, 0);

    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptionsService.getCloseInactiveOrPaymentFailedLiveAppointmentsOptions(
      queryBuilder,
      thresholdTime,
    );
    const liveAppointments = await queryBuilder.getMany();

    if (liveAppointments.length > 0) {
      this.lokiLogger.log(`Found ${liveAppointments.length} live appointments for closing.`);
      await this.closeInactiveOrPaymentFailedMeetings(liveAppointments);
    }
  }

  private async closeInactiveOrPaymentFailedMeetings(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      const { clientLastActiveTime, chimeMeetingConfiguration } = appointment;

      if (!chimeMeetingConfiguration || !chimeMeetingConfiguration.chimeMeetingId || !clientLastActiveTime) {
        this.lokiLogger.error(
          `No Chime Meeting Configuration found for appointment Id: ${appointment.id}, skipping closing. Trying to close expired appointments without client visit.`,
        );
        await this.closeExpiredAppointmentsWithoutClientVisit();
        continue;
      }

      this.lokiLogger.log(`Closing appointment with Id: ${appointment.id}`);
      await this.queueManagementService.addCloseMeetingQueue(chimeMeetingConfiguration.chimeMeetingId);
    }
  }

  public async closeExpiredAppointmentsWithoutClientVisit(): Promise<void> {
    const currentTime = new Date();

    const queryOptions =
      this.appointmentQueryOptionsService.getCloseExpiredAppointmentsWithoutClientVisitOptions(currentTime);
    const appointmentsToClose = await findManyTyped<TAppointmentsWithoutClientVisit[]>(
      this.appointmentRepository,
      queryOptions,
    );

    if (appointmentsToClose.length > 0) {
      this.lokiLogger.log(`Found ${appointmentsToClose.length} expired scheduled appointments.`);
      await this.queueManagementService.addCloseMeetingWithoutClientVisitQueue(appointmentsToClose);
    }
  }

  public async processExpiredAppointmentsWithoutCheckIn(): Promise<void> {
    const currentTime = new Date();
    currentTime.setSeconds(0, 0);

    const queryOptions =
      this.appointmentQueryOptionsService.getProcessExpiredAppointmentsWithoutCheckInOptions(currentTime);
    const expiredAppointments = (await this.appointmentRepository.find(queryOptions)) as TCancelAppointment[];

    if (expiredAppointments.length > 0) {
      this.lokiLogger.log(`Found ${expiredAppointments.length} expired appointments without check-in.`);

      const expiredAppointmentsIds = expiredAppointments.map((appointment) => appointment.id);
      await this.updateExpiredAppointmentsStatus(expiredAppointmentsIds);

      await this.appointmentCancelService.cancelExpiredAppointmentWithoutCheckIn(expiredAppointments);
    }
  }

  private async updateExpiredAppointmentsStatus(expiredAppointmentsIds: string[]): Promise<void> {
    const updateResult = await this.appointmentRepository
      .createQueryBuilder()
      .update(Appointment)
      .set({ status: EAppointmentStatus.NO_SHOW })
      .whereInIds(expiredAppointmentsIds)
      .execute();
    this.lokiLogger.log(`Updated status to no-show for ${updateResult.affected} appointments.`);
  }

  public async processInterpreterHasLateAppointments(): Promise<void> {
    const currentTime = new Date();
    const lateThreshold = new Date(currentTime.getTime() - NUMBER_OF_MILLISECONDS_IN_MINUTE);

    const queryOptions = this.appointmentQueryOptionsService.getInterpreterHasLateAppointmentsOptions(lateThreshold);
    const interpreterHasLateAppointments = await this.appointmentRepository.find(queryOptions);

    if (interpreterHasLateAppointments.length > 0) {
      this.lokiLogger.log(`Found ${interpreterHasLateAppointments.length} appointments with late interpreters.`);
      await this.handleInterpreterHasLateAppointments(interpreterHasLateAppointments);
    }
  }

  private async handleInterpreterHasLateAppointments(appointments: Appointment[]): Promise<void> {
    const interpreterHasLateAppointmentsIds = appointments.map((appointment) => appointment.id);
    await this.updateInterpreterHasLateAppointments(interpreterHasLateAppointmentsIds);
    const convertedLateMinutes = String(NUMBER_OF_MINUTES_IN_FIVE_MINUTES);

    for (const appointment of appointments) {
      if (appointment.interpreterId) {
        const LATE_NOTIFICATION_LINK = `${this.BACK_END_URL}/v1/appointments/commands/late-notification/${appointment.id}`;

        await this.appointmentNotificationService.sendToInterpreterLateNotification(
          appointment.interpreterId,
          appointment.platformId,
          {
            appointmentId: appointment.id,
            lateNotificationLink: LATE_NOTIFICATION_LINK,
            lateMinutes: convertedLateMinutes,
          },
        );
      }
    }
  }

  private async updateInterpreterHasLateAppointments(interpreterHasLateAppointmentsIds: string[]): Promise<void> {
    const updateResult = await this.chimeMeetingConfigurationRepository
      .createQueryBuilder()
      .update(ChimeMeetingConfiguration)
      .set({ isInterpreterWasOnlineInBooking: false })
      .where("appointmentId IN (:...ids)", { ids: interpreterHasLateAppointmentsIds })
      .execute();

    this.lokiLogger.log(`Mark isInterpreterWasOnlineInBooking to false for ${updateResult.affected} appointments.`);
  }
}
