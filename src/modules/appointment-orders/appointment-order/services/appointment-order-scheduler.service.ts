import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ObjectLiteral, Repository } from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import {
  AppointmentOrderExpirationCancelService,
  AppointmentOrderNotificationService,
} from "src/modules/appointment-orders/appointment-order/services";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { HelperService } from "src/modules/helper/services";
import { SearchEngineLogicService } from "src/modules/search-engine-logic/services";
import {
  AppointmentOrderQueryOptionsService,
  SearchTimeFrameService,
} from "src/modules/appointment-orders/shared/services";
import { LokiLogger } from "src/common/logger";
import { IAppointmentOrderInvitationOutput } from "src/modules/search-engine-logic/common/outputs";
import { NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS } from "src/common/constants";
import { delay } from "src/common/utils";

@Injectable()
export class OrderSchedulerService {
  private readonly lokiLogger = new LokiLogger(OrderSchedulerService.name);

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly appointmentOrderExpirationCancelService: AppointmentOrderExpirationCancelService,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly searchTimeFrameService: SearchTimeFrameService,
    private readonly appointmentOrderNotificationService: AppointmentOrderNotificationService,
    private readonly helperService: HelperService,
    private readonly searchEngineLogicService: SearchEngineLogicService,
  ) {}

  public async processNextRepeatTimeOrders(): Promise<void> {
    const currentTime = new Date();
    const orderOptions = this.appointmentOrderQueryOptionsService.getNextRepeatTimeOrdersOptions(currentTime);
    const groupOptions = this.appointmentOrderQueryOptionsService.getNextRepeatTimeOrderGroupsOptions(currentTime);

    const appointmentOrders = await this.appointmentOrderRepository.find(orderOptions);
    const appointmentOrderGroups = await this.appointmentOrderGroupRepository.find(groupOptions);

    if (appointmentOrders.length > 0) {
      void this.processNextRepeatTimeForOrders(currentTime, appointmentOrders);
    }

    if (appointmentOrderGroups.length > 0) {
      void this.processNextRepeatTimeForOrderGroups(currentTime, appointmentOrderGroups);
    }
  }

  private async processNextRepeatTimeForOrders(
    currentTime: Date,
    appointmentOrders: AppointmentOrder[],
  ): Promise<void> {
    for (const order of appointmentOrders) {
      await this.processSingleOrder(currentTime, order, false).catch((error: Error) => {
        this.lokiLogger.error(`Error in processNextRepeatTimeForOrders with order Id: ${order.id}`, error.stack);
      });
    }
  }

  private async processNextRepeatTimeForOrderGroups(
    currentTime: Date,
    appointmentOrderGroups: AppointmentOrderGroup[],
  ): Promise<void> {
    for (const group of appointmentOrderGroups) {
      await this.processSingleOrder(currentTime, group, true).catch((error: Error) => {
        this.lokiLogger.error(`Error in processNextRepeatTimeForOrderGroups with group Id: ${group.id}`, error.stack);
      });
    }
  }

  private async processSingleOrder(
    currentTime: Date,
    order: AppointmentOrder | AppointmentOrderGroup,
    isOrderGroup: boolean,
  ): Promise<void> {
    if (!order.repeatInterval) {
      throw new NotFoundException(`Repeat Interval is not set for order with id: ${order.id}`);
    }

    const newNextRepeatTime = await this.searchTimeFrameService.calculateNextRepeatTime(
      currentTime,
      order.repeatInterval,
    );

    await this.updateOrderNextRepeatTime(order, newNextRepeatTime, isOrderGroup);

    if (order.matchedInterpreterIds.length > 0) {
      if (!isOrderGroup) {
        await this.sendNotificationToInterpreters(order.platformId, order.matchedInterpreterIds, false, {
          appointmentOrderId: order.id,
          appointmentId: (order as AppointmentOrder).appointment.id,
        });
      } else {
        await this.sendNotificationToInterpreters(order.platformId, order.matchedInterpreterIds, true, {
          appointmentOrderGroupId: order.id,
          appointmentsGroupId: order.platformId,
        });
      }
    } else {
      return;
    }
  }

  private async updateOrderNextRepeatTime(
    order: AppointmentOrder | AppointmentOrderGroup,
    newNextRepeatTime: Date,
    isOrderGroup: boolean,
  ): Promise<void> {
    const { id, remainingRepeats } = order;

    if (!remainingRepeats) {
      throw new NotFoundException(`Remaining Repeats is not set for order with id: ${order.id}`);
    }

    const updatedData = {
      nextRepeatTime: newNextRepeatTime,
      remainingRepeats: remainingRepeats - 1,
    };

    if (!isOrderGroup) {
      await this.appointmentOrderRepository.update(id, updatedData);
    } else {
      await this.appointmentOrderGroupRepository.update(id, updatedData);
    }
  }

  private async sendNotificationToInterpreters(
    platformId: string,
    matchedInterpreterIds: string[],
    isOrderGroup: boolean,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    if (!isOrderGroup) {
      await this.appointmentOrderNotificationService.sendNotificationToMatchedInterpretersForOrder(
        platformId,
        matchedInterpreterIds,
        appointmentOrderInvitation,
      );
    } else {
      await this.appointmentOrderNotificationService.sendNotificationToMatchedInterpretersForGroup(
        platformId,
        matchedInterpreterIds,
        appointmentOrderInvitation,
      );
    }
  }

  public async processNotifyAdminOrders(): Promise<void> {
    const currentTime = new Date();
    const orderOptions = this.appointmentOrderQueryOptionsService.getNotifyAdminOrdersOptions(currentTime);
    const groupOptions = this.appointmentOrderQueryOptionsService.getNotifyAdminOrderGroupsOptions(currentTime);

    const appointmentOrders = await this.appointmentOrderRepository.find(orderOptions);
    const appointmentOrderGroups = await this.appointmentOrderGroupRepository.find(groupOptions);

    let lfhAdmins: UserRole[] = [];

    if (appointmentOrders.length > 0 || appointmentOrderGroups.length > 0) {
      lfhAdmins = await this.helperService.getAllLfhAdmins();
    }

    if (appointmentOrders.length > 0) {
      this.processNotifyAdminForOrders(appointmentOrders, lfhAdmins).catch((error: Error) => {
        this.lokiLogger.error("Error in processNotifyAdminForOrders", error.stack);
      });
    }

    if (appointmentOrderGroups.length > 0) {
      this.processNotifyAdminForOrderGroups(appointmentOrderGroups, lfhAdmins).catch((error: Error) => {
        this.lokiLogger.error("Error in processNotifyAdminForOrderGroups", error.stack);
      });
    }
  }

  private async processNotifyAdminForOrders(
    appointmentOrders: AppointmentOrder[],
    lfhAdmins: UserRole[],
  ): Promise<void> {
    await this.setRedFlagEnabledForOrders(appointmentOrders);

    for (const order of appointmentOrders) {
      await this.appointmentOrderNotificationService.sendNotificationToAdmins(lfhAdmins, order.platformId, false, {
        appointmentId: order.appointment.id,
      });
    }
  }

  private async processNotifyAdminForOrderGroups(
    appointmentOrderGroups: AppointmentOrderGroup[],
    lfhAdmins: UserRole[],
  ): Promise<void> {
    await this.setRedFlagEnabledForOrderGroups(appointmentOrderGroups);

    for (const group of appointmentOrderGroups) {
      await this.appointmentOrderNotificationService.sendNotificationToAdmins(lfhAdmins, group.platformId, true, {
        appointmentsGroupId: group.platformId,
      });
    }
  }

  private async setRedFlagEnabledForOrders(appointmentOrders: AppointmentOrder[]): Promise<void> {
    const orderIds = appointmentOrders.map((order) => order.id);
    const appointmentIds = appointmentOrders.map((order) => order.appointment.id);

    await this.updateNotifyAdminToNull(this.appointmentOrderRepository, orderIds, "appointment_orders");
    await this.updateRedFlagEnabledForAppointments(appointmentIds);
  }

  private async setRedFlagEnabledForOrderGroups(appointmentOrderGroups: AppointmentOrderGroup[]): Promise<void> {
    const groupIds = appointmentOrderGroups.map((group) => group.id);

    await this.updateNotifyAdminToNull(this.appointmentOrderGroupRepository, groupIds, "appointment_order_groups");

    const platformIds = appointmentOrderGroups.map((group) => group.platformId);
    const appointmentIds = await this.getAppointmentIdsByGroupPlatformIds(platformIds);

    await this.updateRedFlagEnabledForAppointments(appointmentIds);
  }

  private async updateNotifyAdminToNull<T extends ObjectLiteral>(
    repository: Repository<T>,
    ids: string[],
    entityName: string,
  ): Promise<void> {
    const updateResult = await repository
      .createQueryBuilder()
      .update(entityName)
      .set({ notifyAdmin: null })
      .whereInIds(ids)
      .execute();

    this.lokiLogger.log(`Set notifyAdmin to null for ${updateResult.affected} ${entityName}.`);
  }

  private async getAppointmentIdsByGroupPlatformIds(platformIds: string[]): Promise<string[]> {
    const appointments = await this.appointmentRepository
      .createQueryBuilder("appointment")
      .select("appointment.id")
      .where("appointment.appointmentsGroupId IN (:...platformIds)", { platformIds })
      .getMany();

    return appointments.map((appointment) => appointment.id);
  }

  private async updateRedFlagEnabledForAppointments(appointmentIds: string[]): Promise<void> {
    const RED_FLAG_MESSAGE = "An interpreter has not yet been found for this appointment.";

    if (appointmentIds.length === 0) {
      this.lokiLogger.error("No appointments found to update isRedFlagEnabled.");

      return;
    }

    const updateResult = await this.appointmentAdminInfoRepository
      .createQueryBuilder()
      .update(AppointmentAdminInfo)
      .set({
        isRedFlagEnabled: true,
        message: RED_FLAG_MESSAGE,
      })
      .where("appointment_id IN (:...appointmentIds)", { appointmentIds })
      .execute();

    this.lokiLogger.log(`Set Red Flag Enabled to true for ${updateResult.affected} admin infos.`);
  }

  public async processEndSearchTimeOrders(): Promise<void> {
    const currentTime = new Date();

    const orderOptions = this.appointmentOrderQueryOptionsService.getEndSearchTimeOrdersOptions(currentTime);
    const groupOptions = this.appointmentOrderQueryOptionsService.getEndSearchTimeOrderGroupsOptions(currentTime);

    const appointmentOrders = await this.appointmentOrderRepository.find(orderOptions);
    const appointmentOrderGroups = await this.appointmentOrderGroupRepository.find(groupOptions);

    if (appointmentOrders.length > 0) {
      void this.processEndSearchTimeForOrders(appointmentOrders);
    }

    if (appointmentOrderGroups.length > 0) {
      void this.processEndSearchTimeForOrderGroups(appointmentOrderGroups);
    }
  }

  private async processEndSearchTimeForOrders(appointmentOrders: AppointmentOrder[]): Promise<void> {
    for (const order of appointmentOrders) {
      await this.appointmentOrderExpirationCancelService.cancelExpiredAppointmentOrder(order).catch((error: Error) => {
        this.lokiLogger.error(`Error in cancelExpiredAppointmentOrder for order with Id: ${order.id} `, error.stack);
      });
    }
  }

  private async processEndSearchTimeForOrderGroups(appointmentOrderGroups: AppointmentOrderGroup[]): Promise<void> {
    for (const group of appointmentOrderGroups) {
      await this.appointmentOrderExpirationCancelService
        .cancelExpiredGroupAppointmentOrders(group)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in cancelExpiredGroupAppointmentOrders for group with Id: ${group.id} `,
            error.stack,
          );
        });
    }
  }

  public async processSearchEngineTasksInterval(): Promise<void> {
    const REPETITIONS: number = 6;

    for (let i = 0; i < REPETITIONS; i++) {
      await this.processSearchEngineTasks().catch((error: Error) => {
        this.lokiLogger.error("Error in processSearchEngineTasks", error.stack);
      });

      if (i < REPETITIONS - 1) {
        await delay(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS);
      }
    }
  }

  private async processSearchEngineTasks(): Promise<void> {
    const currentTime = new Date();

    const orderOptions = this.appointmentOrderQueryOptionsService.getSearchEngineTasksOrdersOptions(currentTime);
    const groupOptions = this.appointmentOrderQueryOptionsService.getSearchEngineTasksOrderGroupsOptions(currentTime);

    const ordersNeedingSecondSearch = await this.appointmentOrderRepository.find(orderOptions);
    const groupsNeedingSecondSearch = await this.appointmentOrderGroupRepository.find(groupOptions);

    if (ordersNeedingSecondSearch.length > 0) {
      void this.processOrdersNeedingSearch(ordersNeedingSecondSearch);
    }

    if (groupsNeedingSecondSearch.length > 0) {
      void this.processGroupsNeedingSearch(groupsNeedingSecondSearch);
    }
  }

  private async processOrdersNeedingSearch(appointmentOrders: AppointmentOrder[]): Promise<void> {
    for (const order of appointmentOrders) {
      await this.searchEngineLogicService.launchSearchForIndividualOrder(order.id).catch((error: Error) => {
        this.lokiLogger.error(`Error in launchSearch for order with Id: ${order.id} `, error.stack);
      });
    }
  }

  private async processGroupsNeedingSearch(appointmentOrderGroups: AppointmentOrderGroup[]): Promise<void> {
    for (const group of appointmentOrderGroups) {
      await this.searchEngineLogicService.launchSearchForOrderGroup(group.id).catch((error: Error) => {
        this.lokiLogger.error(`Error in launchSearch for group with Id: ${group.id} `, error.stack);
      });
    }
  }
}
