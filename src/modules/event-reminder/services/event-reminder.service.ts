import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { Appointment, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { NotificationService } from "src/modules/notifications/services";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import {
  NUMBER_OF_HOURS_IN_DAY,
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MINUTES_IN_HOUR,
} from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { CONFLICT_APPOINTMENT_ACCEPTED_STATUSES } from "src/modules/appointments/shared/common/constants";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";

export class EventReminderService {
  private readonly lokiLogger = new LokiLogger(EventReminderService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    private readonly notificationService: NotificationService,
  ) {}

  public async startAutoReminder(): Promise<void> {
    await this.getUpcomingAppointments();
  }

  public async getUpcomingAppointments(): Promise<void> {
    const today = new Date();

    const upcomingAppointmentsInTwoMinutes = await this.getUpcomingAppointmentsInTwoMinutes(today);
    await this.upcomingAppointmentsInTwoMinutes(upcomingAppointmentsInTwoMinutes);
    const upcomingAppointmentsInTenMinutes = await this.getUpcomingAppointmentsInTenMinutes(today);
    await this.upcomingAppointmentsInTenMinutes(upcomingAppointmentsInTenMinutes);
    const upcomingAppointmentsInTwoHours = await this.getUpcomingAppointmentsInTwoHours(today);
    await this.upcomingAppointmentsInTwoHours(upcomingAppointmentsInTwoHours);
    const upcomingAppointmentsInTwentyFourHours = await this.getUpcomingAppointmentsInTwentyFourHours(today);
    await this.upcomingAppointmentsInTwentyFourHours(upcomingAppointmentsInTwentyFourHours);
  }

  private async getUpcomingAppointmentsInTwoMinutes(today: Date): Promise<Appointment[]> {
    const oneMinute: number = 1;
    const threeMinutes: number = 3;
    const lowerBound = new Date(today.getTime() + oneMinute * NUMBER_OF_MILLISECONDS_IN_MINUTE);
    lowerBound.setSeconds(0, 0);
    const upperBound = new Date(today.getTime() + threeMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE);
    upperBound.setSeconds(0, 0);

    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        platformId: true,
        clientId: true,
        interpreterId: true,
        scheduledStartTime: true,
        status: true,
        appointmentReminder: {
          id: true,
          isReminderSentTwoMinutes: true,
        },
      },
      where: {
        status: In(CONFLICT_APPOINTMENT_ACCEPTED_STATUSES),
        scheduledStartTime: Between(lowerBound, upperBound),
        appointmentReminder: { isReminderSentTwoMinutes: false },
      },
      relations: {
        appointmentReminder: true,
      },
    });

    return appointments;
  }

  private async getUpcomingAppointmentsInTenMinutes(today: Date): Promise<Appointment[]> {
    const nineMinutes: number = 9;
    const elevenMinutes: number = 11;
    const lowerBound = new Date(today.getTime() + nineMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE);
    lowerBound.setSeconds(0, 0);
    const upperBound = new Date(today.getTime() + elevenMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE);
    upperBound.setSeconds(0, 0);

    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        platformId: true,
        clientId: true,
        interpreterId: true,
        scheduledStartTime: true,
        status: true,
        appointmentReminder: {
          id: true,
          isReminderSentTenMinutes: true,
        },
      },
      where: {
        status: EAppointmentStatus.ACCEPTED,
        scheduledStartTime: Between(lowerBound, upperBound),
        appointmentReminder: { isReminderSentTenMinutes: false },
      },
      relations: {
        appointmentReminder: true,
      },
    });

    return appointments;
  }

  private async getUpcomingAppointmentsInTwoHours(today: Date): Promise<Appointment[]> {
    const twoHours: number = 2;
    const oneMinute: number = 1;
    const lowerBound = new Date(
      today.getTime() + (twoHours * NUMBER_OF_MINUTES_IN_HOUR - oneMinute) * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );
    lowerBound.setSeconds(0, 0);
    const upperBound = new Date(
      today.getTime() + (twoHours * NUMBER_OF_MINUTES_IN_HOUR + oneMinute) * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );
    upperBound.setSeconds(0, 0);

    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        platformId: true,
        clientId: true,
        interpreterId: true,
        scheduledStartTime: true,
        status: true,
        appointmentReminder: {
          id: true,
          isReminderSentTenMinutes: true,
        },
      },
      where: {
        status: EAppointmentStatus.ACCEPTED,
        scheduledStartTime: Between(lowerBound, upperBound),
        appointmentReminder: { isReminderSentTwoHours: false },
      },
      relations: {
        appointmentReminder: true,
      },
    });

    return appointments;
  }

  private async getUpcomingAppointmentsInTwentyFourHours(today: Date): Promise<Appointment[]> {
    const oneMinute: number = 1;
    const lowerBound = new Date(
      today.getTime() +
        (NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR - oneMinute) * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );
    lowerBound.setSeconds(0, 0);
    const upperBound = new Date(
      today.getTime() +
        (NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR + oneMinute) * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );
    upperBound.setSeconds(0, 0);

    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        platformId: true,
        clientId: true,
        interpreterId: true,
        scheduledStartTime: true,
        status: true,
        appointmentReminder: {
          id: true,
          isReminderSentTenMinutes: true,
        },
      },
      where: {
        status: EAppointmentStatus.ACCEPTED,
        scheduledStartTime: Between(lowerBound, upperBound),
        appointmentReminder: { isReminderSentTwentyFourHours: false },
      },
      relations: {
        appointmentReminder: true,
      },
    });

    return appointments;
  }

  private async upcomingAppointmentsInTwoMinutes(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      if (appointment.clientId && appointment.interpreterId && appointment.appointmentReminder) {
        await this.sendTwoMinutesNotification(appointment.clientId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.sendTwoMinutesNotification(appointment.interpreterId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.appointmentReminderRepository.update(appointment.appointmentReminder.id, {
          isReminderSentTwoMinutes: true,
        });
      }
    }
  }

  private async upcomingAppointmentsInTenMinutes(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      if (appointment.clientId && appointment.interpreterId && appointment.appointmentReminder) {
        await this.sendTenMinutesNotification(appointment.clientId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.sendTenMinutesNotification(appointment.interpreterId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.appointmentReminderRepository.update(appointment.appointmentReminder.id, {
          isReminderSentTenMinutes: true,
        });
      }
    }
  }

  private async upcomingAppointmentsInTwoHours(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      if (appointment.clientId && appointment.interpreterId && appointment.appointmentReminder) {
        await this.senTwoHoursNotification(appointment.clientId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.senTwoHoursNotification(appointment.interpreterId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.appointmentReminderRepository.update(appointment.appointmentReminder.id, {
          isReminderSentTwoHours: true,
        });
      }
    }
  }

  private async upcomingAppointmentsInTwentyFourHours(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      if (appointment.clientId && appointment.interpreterId && appointment.appointmentReminder) {
        await this.sendTwentyFourHoursNotification(appointment.clientId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.sendTwentyFourHoursNotification(appointment.interpreterId, appointment.platformId, {
          appointmentId: appointment.id,
        });
        await this.appointmentReminderRepository.update(appointment.appointmentReminder.id, {
          isReminderSentTwentyFourHours: true,
        });
      }
    }
  }

  private async sendTwoMinutesNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendReminderForAppointmentInTwoMinutesNotification(userRoleId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send 2 minutes reminder for appointment notification for userRoleId: ${userRoleId}`,
          error.stack,
        );
      });
  }

  private async sendTenMinutesNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendReminderForAppointmentInTenMinutesNotification(userRoleId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send 10 minutes reminder for appointment notification for userRoleId: ${userRoleId}`,
          error.stack,
        );
      });
  }

  private async senTwoHoursNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendReminderForAppointmentInTwoHoursNotification(userRoleId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send 2 hours reminder for appointment notification for userRoleId: ${userRoleId}`,
          error.stack,
        );
      });
  }

  private async sendTwentyFourHoursNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendReminderForAppointmentInTwentyFourHoursNotification(userRoleId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send 24 hours reminder for appointment notification for userRoleId: ${userRoleId}`,
          error.stack,
        );
      });
  }
}
