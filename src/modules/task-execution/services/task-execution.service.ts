import { Injectable } from "@nestjs/common";
import { BackyCheckService } from "src/modules/backy-check/services";
import { FillStatisticsService } from "src/modules/statistics/services";
import { NotificationService } from "src/modules/notifications/services";
import { EventReminderService } from "src/modules/event-reminder/services";
import { AppointmentSchedulerService } from "src/modules/appointments/appointment/services";
import { MessagingManagementService } from "src/modules/chime-messaging-configuration/services";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { EStatisticType } from "src/modules/statistics/common/enums";
import { OrderSchedulerService } from "src/modules/appointment-orders/appointment-order/services";
import { DraftAppointmentService } from "src/modules/draft-appointments/services";
import { RemovalSchedulerService } from "src/modules/removal/services";
import { MembershipAssignmentsService } from "src/modules/memberships/services";
import { LokiLogger } from "src/common/logger";
import { OldCorporatePaymentsService, OldGeneralPaymentsService } from "src/modules/payments/services";
import { CompaniesDepositChargeExecutionService } from "src/modules/companies-deposit-charge/services";
import { InterpreterCancellationRecordService } from "src/modules/interpreters/profile/services";
import { PromoCampaignBannersService, PromoCampaignsService } from "src/modules/promo-campaigns/services";

@Injectable()
export class TaskExecutionService {
  private readonly lokiLogger = new LokiLogger(TaskExecutionService.name);
  public constructor(
    private readonly backyCheckService: BackyCheckService,
    private readonly fillStatisticsService: FillStatisticsService,
    private readonly notificationService: NotificationService,
    private readonly eventReminderService: EventReminderService,
    private readonly appointmentSchedulerService: AppointmentSchedulerService,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly orderSchedulerService: OrderSchedulerService,
    private readonly draftAppointmentService: DraftAppointmentService,
    private readonly removalSchedulerService: RemovalSchedulerService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly generalPaymentsService: OldGeneralPaymentsService,
    private readonly companiesDepositChargeExecutionService: CompaniesDepositChargeExecutionService,
    private readonly corporatePaymentsService: OldCorporatePaymentsService,
    private readonly interpreterCancellationRecordService: InterpreterCancellationRecordService,
    private readonly promoCampaignsService: PromoCampaignsService,
    private readonly promoCampaignBannersService: PromoCampaignBannersService,
  ) {}

  public async autoCheckBackyCheckStatus(): Promise<void> {
    try {
      await this.backyCheckService.checkBackyCheckStatus();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCheckBackyCheckStatus: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoProcessScheduledRemovals(): Promise<void> {
    try {
      await this.removalSchedulerService.processScheduledRemovals();
    } catch (error) {
      this.lokiLogger.error(`Error in autoRemovingCompanies: ${(error as Error).message}, ${(error as Error).stack}`);
      throw error;
    }
  }

  public async autoReminderNotifications(): Promise<void> {
    try {
      await this.eventReminderService.startAutoReminder();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoReminderNotifications: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoDeletionNotifications(): Promise<void> {
    try {
      await this.notificationService.deleteOldNotifications();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoDeletionNotifications: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoDeletionDraftAppointments(): Promise<void> {
    try {
      await this.draftAppointmentService.deleteOldDraftAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoDeletionDraftAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoActivateUpcomingAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.activateUpcomingAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoActivateUpcomingAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoCloseInactiveOrPaymentFailedLiveAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.closeInactiveOrPaymentFailedLiveAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCloseInactiveOrPaymentFailedLiveAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoCloseExpiredAppointmentsWithoutClientVisit(): Promise<void> {
    try {
      await this.appointmentSchedulerService.closeExpiredAppointmentsWithoutClientVisit();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCloseExpiredAppointmentsWithoutClientVisit: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoDeleteOldChannels(): Promise<void> {
    try {
      await this.messagingManagementService.deleteOldChannels();
    } catch (error) {
      this.lokiLogger.error(`Error in autoDeleteOldChannels: ${(error as Error).message}, ${(error as Error).stack}`);
      throw error;
    }
  }

  public async autoProcessExpiredAppointmentsWithoutCheckIn(): Promise<void> {
    try {
      await this.appointmentSchedulerService.processExpiredAppointmentsWithoutCheckIn();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessExpiredAppointmentsWithoutCheckIn: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoProcessInterpreterHasLateAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.processInterpreterHasLateAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessInterpreterHasLateAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoProcessNextRepeatTimeOrders(): Promise<void> {
    try {
      await this.orderSchedulerService.processNextRepeatTimeOrders();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessNextRepeatTimeOrders: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoProcessNotifyAdminOrders(): Promise<void> {
    try {
      await this.orderSchedulerService.processNotifyAdminOrders();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessNotifyAdminOrders: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoProcessEndSearchTimeOrders(): Promise<void> {
    try {
      await this.orderSchedulerService.processEndSearchTimeOrders();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessEndSearchTimeOrders: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoProcessSearchEngineTasks(): Promise<void> {
    try {
      await this.orderSchedulerService.processSearchEngineTasksInterval();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessSearchEngineTasks: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async fillDailyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillDailyStatistics start");

    try {
      const previousDayDate = subDays(new Date(), 1);
      const startOfPreviousDay = startOfDay(previousDayDate);
      const endOfPreviousDay = endOfDay(previousDayDate);

      const statisticType = EStatisticType.DAILY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousDay, endOfPreviousDay, statisticType);
      this.lokiLogger.log("Cron fillDailyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillDailyStatistics: ${(error as Error).stack}`);
      throw error;
    }
  }

  public async fillWeeklyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillWeeklyStatistics start");

    const SIX_DAYS = 6;
    try {
      const startOfPreviousWeek = subDays(startOfWeek(new Date()), SIX_DAYS);
      const endOfPreviousWeek = subDays(endOfWeek(new Date()), SIX_DAYS);

      const statisticType = EStatisticType.WEEKLY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousWeek, endOfPreviousWeek, statisticType);
      this.lokiLogger.log("Cron fillWeeklyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillWeeklyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
      throw error;
    }
  }

  public async fillMonthlyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillMonthlyStatistics start");
    try {
      const previousMonth = subMonths(new Date(), 1);

      const startOfPreviousMonth = startOfMonth(previousMonth);
      const endOfPreviousMonth = endOfMonth(previousMonth);

      const statisticType = EStatisticType.MONTHLY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousMonth, endOfPreviousMonth, statisticType);
      this.lokiLogger.log("Cron fillMonthlyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillMonthlyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
      throw error;
    }
  }

  public async fillYearlyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillYearlyStatistics start");
    try {
      const previousYear = subYears(new Date(), 1);

      const startOfPreviousYear = startOfYear(previousYear);
      const endOfPreviousYear = endOfYear(previousYear);

      const statisticType = EStatisticType.YEARLY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousYear, endOfPreviousYear, statisticType);
      this.lokiLogger.log("Cron fillYearlyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillYearlyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
      throw error;
    }
  }

  public async autoDeactivateExpiredMemberships(): Promise<void> {
    try {
      await this.membershipAssignmentsService.deactivateExpiredMemberships();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoDeactivateExpiredMemberships: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoCheckPaymentWaitList(): Promise<void> {
    try {
      await this.generalPaymentsService.checkPaymentWaitList();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCheckPaymentWaitList: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoChargeCompaniesDeposit(): Promise<void> {
    try {
      await this.companiesDepositChargeExecutionService.executePendingDepositCharges();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoChargeCompaniesDeposit: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoMakeCorporatePayouts(): Promise<void> {
    try {
      await this.corporatePaymentsService.makeCorporatePayouts();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoMakeCorporatePayouts: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoUnlockInterpreterProfiles(): Promise<void> {
    try {
      await this.interpreterCancellationRecordService.unlockInterpreterProfiles();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoUnlockInterpreterProfiles: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoResetInterpreterCancellationRecords(): Promise<void> {
    try {
      await this.interpreterCancellationRecordService.resetInterpreterCancellationRecords();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoResetInterpreterCancellationRecords: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoUpdatePromoCampaignStatuses(): Promise<void> {
    try {
      await this.promoCampaignsService.updatePromoCampaignStatuses();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoUpdatePromoCampaignStatuses: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoRemoveOldPromoCampaigns(): Promise<void> {
    try {
      await this.promoCampaignsService.removeOldPromoCampaigns();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoRemoveOldPromoCampaigns: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }

  public async autoRemoveUnusedPromoCampaignBanners(): Promise<void> {
    try {
      await this.promoCampaignBannersService.removeUnusedPromoCampaignBanners();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoRemoveUnusedPromoCampaignBanners: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw error;
    }
  }
}
