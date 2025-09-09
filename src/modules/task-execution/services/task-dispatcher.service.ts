import { Injectable } from "@nestjs/common";
import { ONE_THOUSAND } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { PrometheusService } from "src/modules/prometheus/services";
import { ECronTasks } from "src/modules/task-execution/common/enum";
import { TaskExecutionService } from "src/modules/task-execution/services";

@Injectable()
export class TaskDispatcherService {
  private readonly lokiLogger = new LokiLogger(TaskDispatcherService.name);

  constructor(
    private readonly cronService: TaskExecutionService,
    private readonly prometheusService: PrometheusService,
  ) {}

  public async executeTasksInBatch(taskIdentifiers: ECronTasks[]): Promise<void> {
    this.lokiLogger.log(
      `Received tasks from utility: ${taskIdentifiers.length}. Executing tasks: ${taskIdentifiers.join(", ")}.`,
    );

    for (const taskId of taskIdentifiers) {
      void this.dispatchTask(taskId);
    }
  }

  private async dispatchTask(taskIdentifier: ECronTasks): Promise<void> {
    this.prometheusService.startCronTaskExecution(taskIdentifier.toString(), taskIdentifier);

    const startTime = Date.now();
    try {
      switch (taskIdentifier) {
        case ECronTasks.AUTO_CHECK_BACKY_CHECK_STATUS:
          await this.cronService.autoCheckBackyCheckStatus();
          break;
        case ECronTasks.AUTO_PROCESS_SCHEDULED_REMOVALS:
          await this.cronService.autoProcessScheduledRemovals();
          break;
        case ECronTasks.AUTO_REMINDER_NOTIFICATIONS:
          await this.cronService.autoReminderNotifications();
          break;
        case ECronTasks.AUTO_DELETION_NOTIFICATIONS:
          await this.cronService.autoDeletionNotifications();
          break;
        case ECronTasks.AUTO_DELETION_DRAFT_APPOINTMENTS:
          await this.cronService.autoDeletionDraftAppointments();
          break;
        case ECronTasks.AUTO_ACTIVATE_UPCOMING_APPOINTMENTS:
          await this.cronService.autoActivateUpcomingAppointments();
          break;
        case ECronTasks.AUTO_CLOSE_INACTIVE_OR_PAYMENT_FAILED_LIVE_APPOINTMENTS:
          await this.cronService.autoCloseInactiveOrPaymentFailedLiveAppointments();
          break;
        case ECronTasks.AUTO_CLOSE_EXPIRED_APPOINTMENTS_WITHOUT_CLIENT_VISIT:
          await this.cronService.autoCloseExpiredAppointmentsWithoutClientVisit();
          break;
        case ECronTasks.AUTO_DELETE_OLD_CHANNELS:
          await this.cronService.autoDeleteOldChannels();
          break;
        case ECronTasks.AUTO_PROCESS_EXPIRED_APPOINTMENTS_WITHOUT_CHECK_IN:
          await this.cronService.autoProcessExpiredAppointmentsWithoutCheckIn();
          break;
        case ECronTasks.AUTO_PROCESS_INTERPRETER_HAS_LATE_APPOINTMENTS:
          await this.cronService.autoProcessInterpreterHasLateAppointments();
          break;
        case ECronTasks.AUTO_PROCESS_NEXT_REPEAT_TIME_ORDERS:
          await this.cronService.autoProcessNextRepeatTimeOrders();
          break;
        case ECronTasks.AUTO_PROCESS_NOTIFY_ADMIN_ORDERS:
          await this.cronService.autoProcessNotifyAdminOrders();
          break;
        case ECronTasks.AUTO_PROCESS_END_SEARCH_TIME_ORDERS:
          await this.cronService.autoProcessEndSearchTimeOrders();
          break;
        case ECronTasks.AUTO_PROCESS_SEARCH_ENGINE_TASKS:
          await this.cronService.autoProcessSearchEngineTasks();
          break;
        case ECronTasks.FILL_DAILY_STATISTICS:
          await this.cronService.fillDailyStatistics();
          break;
        case ECronTasks.FILL_WEEKLY_STATISTICS:
          await this.cronService.fillWeeklyStatistics();
          break;
        case ECronTasks.FILL_MONTHLY_STATISTICS:
          await this.cronService.fillMonthlyStatistics();
          break;
        case ECronTasks.FILL_YEARLY_STATISTICS:
          await this.cronService.fillYearlyStatistics();
          break;
        case ECronTasks.AUTO_DEACTIVATE_EXPIRED_MEMBERSHIPS:
          await this.cronService.autoDeactivateExpiredMemberships();
          break;
        case ECronTasks.AUTO_CHECK_PAYMENT_WAIT_LIST:
          await this.cronService.autoCheckPaymentWaitList();
          break;
        case ECronTasks.AUTO_CHECK_DEPOSIT_CHARGES:
          await this.cronService.autoChargeCompaniesDeposit();
          break;
        case ECronTasks.AUTO_MAKE_CORPORATE_PAYOUTS:
          await this.cronService.autoMakeCorporatePayouts();
          break;
        case ECronTasks.AUTO_UNLOCK_INTERPRETER_PROFILES:
          await this.cronService.autoUnlockInterpreterProfiles();
          break;
        case ECronTasks.AUTO_RESET_INTERPRETER_CANCELLATION_RECORDS:
          await this.cronService.autoResetInterpreterCancellationRecords();
          break;
        case ECronTasks.AUTO_UPDATE_PROMO_CAMPAIGN_STATUSES:
          await this.cronService.autoUpdatePromoCampaignStatuses();
          break;
        case ECronTasks.AUTO_REMOVE_OLD_PROMO_CAMPAIGNS:
          await this.cronService.autoRemoveOldPromoCampaigns();
          break;
        case ECronTasks.AUTO_REMOVE_UNUSED_PROMO_CAMPAIGN_BANNERS:
          await this.cronService.autoRemoveUnusedPromoCampaignBanners();
          break;
        default:
          this.lokiLogger.error(`Unknown task identifier encountered in batch: ${taskIdentifier}`);
          break;
      }

      const durationInSeconds = (Date.now() - startTime) / ONE_THOUSAND;
      this.prometheusService.recordCronTaskSuccess(taskIdentifier.toString(), taskIdentifier, durationInSeconds);
    } catch {
      const durationInSeconds = (Date.now() - startTime) / ONE_THOUSAND;
      this.prometheusService.recordCronTaskFailure(taskIdentifier.toString(), taskIdentifier, durationInSeconds);
    }
  }
}
