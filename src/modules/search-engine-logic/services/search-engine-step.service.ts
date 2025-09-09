import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Repository, SelectQueryBuilder } from "typeorm";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { InjectRepository } from "@nestjs/typeorm";
import {
  SearchEngineNotificationService,
  SearchEngineQueryOptionsService,
} from "src/modules/search-engine-logic/services";
import { HelperService } from "src/modules/helper/services";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import {
  ENaatiLevelStepResult,
  EOrderChangeNotificationType,
  ESearchEngineNotificationFlow,
} from "src/modules/search-engine-logic/common/enum";
import { IGroupSearchContext, ISearchContextBase } from "src/modules/search-engine-logic/common/interface";
import { LokiLogger } from "src/common/logger";
import { ENVIRONMENT, UNDEFINED_VALUE } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import {
  IAppointmentOrderInvitationOutput,
  IOnDemandInvitationOutput,
} from "src/modules/search-engine-logic/common/outputs";
import { AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { RedisService } from "src/modules/redis/services";
import { EAccountStatus } from "src/modules/users/common/enums";

@Injectable()
export class SearchEngineStepService {
  private readonly lokiLogger = new LokiLogger(SearchEngineStepService.name);
  private readonly BACK_END_URL: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly searchEngineNotificationService: SearchEngineNotificationService,
    private readonly searchEngineQueryService: SearchEngineQueryOptionsService,
    private readonly helperService: HelperService,
    private readonly redisService: RedisService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  public initializeQuery(): SelectQueryBuilder<InterpreterProfile> {
    return this.interpreterProfileRepository
      .createQueryBuilder("interpreter")
      .innerJoin("interpreter.userRole", "userRole")
      .addSelect([
        "userRole.id",
        "userRole.operatedByMainCorporateCompanyName",
        "userRole.operatedByCompanyName",
        "userRole.timezone",
      ])
      .innerJoin("userRole.role", "role")
      .andWhere("userRole.isActive = :isActive", { isActive: true })
      .andWhere("userRole.accountStatus = :status", { status: EAccountStatus.ACTIVE });
  }

  public async applyStepWorkingHours(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType } = context;
    const message = `Step 1: ${orderType}: No available interpreters for working hours.`;
    await this.searchEngineQueryService.applyWorkingHoursForAllCompanyCondition(query, order);

    if (!(await this.hasResults(query, message))) {
      await this.setRedFlag(order, orderType, message);

      return false;
    }

    return true;
  }

  public async applyStepWorkingHoursOnDemand(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType } = context;
    const message = `Step 1: ${orderType}: No available interpreters for working hours.`;
    await this.searchEngineQueryService.applyWorkingHoursForAllCompanyOnDemandCondition(query, order);

    if (!(await this.hasResults(query, message))) {
      await this.setRedFlag(order, orderType, message);

      return false;
    }

    return true;
  }

  public async applyStepWorkingHoursForSpecifiedCompany(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<boolean> {
    const { query, order, orderType, setRedFlags } = context;
    const message = `Step 1: ${orderType}: No available interpreters for working hours.`;
    await this.searchEngineQueryService.applyWorkingHoursForSpecifiedCompanyCondition(query, order);

    if (!(await this.hasResults(query, message))) {
      if (setRedFlags) {
        await this.setRedFlag(order, orderType, message);
      }

      return false;
    }

    return true;
  }

  public async applyStepService(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType, setRedFlags } = context;
    const message = `Step 2: ${orderType}: No available interpreters for services.`;
    await this.searchEngineQueryService.applyServiceCondition(query, order);

    if (!(await this.hasResults(query, message))) {
      if (setRedFlags) {
        await this.setRedFlag(order, orderType, message);
      }

      return false;
    }

    return true;
  }

  public async applyStepFaceToFacePreBooked(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType, setRedFlags } = context;

    if (!order.address) {
      const message = `Step 3: ${orderType}: Error: No order address.`;
      await this.setRedFlag(order, orderType, message);

      return false;
    }

    const { latitude, longitude } = order.address;
    const message = `Step 3: ${orderType}: No available interpreters within the face-to-face radius.`;
    await this.searchEngineQueryService.applyFaceToFacePreBookedCondition(query, latitude, longitude);

    if (!(await this.hasResults(query, message))) {
      if (setRedFlags) {
        await this.setRedFlag(order, orderType, message);
      }

      return false;
    }

    return true;
  }

  public async applyStepFaceToFaceOnDemand(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType, setRedFlags } = context;

    if (!order.address) {
      const message = `Step 3: ${orderType}: Error: No order address.`;
      await this.setRedFlag(order, orderType, message);

      return false;
    }

    const { latitude, longitude } = order.address;
    const message = `Step 3: ${orderType}: No available interpreters within the face-to-face radius.`;
    await this.searchEngineQueryService.applyFaceToFaceOnDemandCondition(query, latitude, longitude);

    if (!(await this.hasResults(query, message))) {
      if (setRedFlags) {
        await this.setRedFlag(order, orderType, message);
      }

      return false;
    }

    return true;
  }

  public async applyStepConsecutiveTopic(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType } = context;

    if (order.interpretingType === EAppointmentInterpretingType.CONSECUTIVE) {
      const queryBeforeStep4 = query.clone();
      const message = `Step 4: ${orderType}: No available interpreters for consecutive expertise.`;
      await this.searchEngineQueryService.applyConsecutiveTopicCondition(query, order.topic);

      if (!(await this.hasResults(query, message))) {
        return await this.handleConsecutiveTopicFallback(queryBeforeStep4, order, orderType);
      }
    }

    return true;
  }

  private async handleConsecutiveTopicFallback(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
    orderType: EAppointmentSchedulingType,
  ): Promise<false> {
    const message = `Step 4.1: ${orderType}: No available interpreters for general expertise.`;

    if (order.topic === EAppointmentTopic.LEGAL || order.topic === EAppointmentTopic.MEDICAL) {
      await this.searchEngineQueryService.applyConsecutiveTopicGeneralCondition(query);

      if (!(await this.hasResults(query, message))) {
        await this.setRedFlag(order, orderType, message);

        return false;
      }

      return await this.tryPreferredGender(query, order, orderType);
    } else {
      await this.setRedFlag(order, orderType, message);

      return false;
    }
  }

  private async tryPreferredGender(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
    orderType: EAppointmentSchedulingType,
  ): Promise<false> {
    const message = `Step 4.2: ${orderType}: No available interpreters for expertise and preferred gender.`;

    if (order.preferredInterpreterGender) {
      const queryForDifferentGender = query.clone();
      await this.searchEngineQueryService.applyGenderCondition(query, order.preferredInterpreterGender);

      if (!(await this.hasResults(query, message))) {
        return await this.tryDifferentGender(queryForDifferentGender, order, orderType);
      } else {
        await this.sendChangeNotificationToClient(order, EOrderChangeNotificationType.TOPIC);

        return false;
      }
    }

    await this.setRedFlag(order, orderType, message);

    return false;
  }

  private async tryDifferentGender(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
    orderType: EAppointmentSchedulingType,
  ): Promise<false> {
    if (!order.preferredInterpreterGender) {
      return false;
    }

    const message = `Step 4.3: ${orderType}: No available interpreters matching for expertise and different gender.`;
    await this.searchEngineQueryService.applyDifferentGenderCondition(query, order.preferredInterpreterGender);

    if (!(await this.hasResults(query, message))) {
      await this.setRedFlag(order, orderType, message);

      return false;
    } else {
      await this.sendChangeNotificationToClient(order, EOrderChangeNotificationType.GENDER_AND_TOPIC);

      return false;
    }
  }

  public async applyStepGender(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType, sendNotifications } = context;

    if (order.preferredInterpreterGender) {
      const queryBeforeStep5 = query.clone();
      const message = `Step 5: ${orderType}: No available interpreters matching for preferred gender.`;
      await this.searchEngineQueryService.applyGenderCondition(query, order.preferredInterpreterGender);

      if (!(await this.hasResults(query, message))) {
        if (sendNotifications) {
          return await this.tryDifferentGenderSecondFlow(queryBeforeStep5, order, orderType);
        }
      }
    }

    return true;
  }

  private async tryDifferentGenderSecondFlow(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
    orderType: EAppointmentSchedulingType,
  ): Promise<false> {
    if (!order.preferredInterpreterGender) {
      return false;
    }

    const message = `Step 5.1: ${orderType}: No available interpreters matching for different gender.`;
    await this.searchEngineQueryService.applyDifferentGenderCondition(query, order.preferredInterpreterGender);

    if (!(await this.hasResults(query, message))) {
      await this.setRedFlag(order, orderType, message);

      return false;
    } else {
      await this.sendChangeNotificationToClient(order, EOrderChangeNotificationType.GENDER);

      return false;
    }
  }

  public async applyNaatiLevelStepsWithFreeSlot(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<ENaatiLevelStepResult> {
    const { query } = context;
    const originalQuery = query.clone();

    if (await this.applyStepWithNaatiThirdAndFourthLevel(context)) {
      return ENaatiLevelStepResult.FOURTH_AND_THIRD;
    }

    context.query = originalQuery.clone();

    if (await this.applyStepWithoutNaatiFirstLevelOrFreeSlot(context)) {
      return ENaatiLevelStepResult.SECOND_AND_FIRST;
    }

    return ENaatiLevelStepResult.NO_MATCH;
  }

  public async applyNaatiLevelStepsIgnoreFreeSlot(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<ENaatiLevelStepResult> {
    const { query } = context;
    const originalQuery = query.clone();

    if (await this.applyStepWithNaatiThirdAndFourthLevelIgnoreFreeSlot(context)) {
      return ENaatiLevelStepResult.FOURTH_AND_THIRD;
    }

    context.query = originalQuery.clone();

    if (await this.applyStepWithoutNaatiFirstLevelIgnoreFreeSlot(context)) {
      return ENaatiLevelStepResult.SECOND_AND_FIRST;
    }

    return ENaatiLevelStepResult.NO_MATCH;
  }

  public async applyStepWithNaatiThirdAndFourthLevel(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<boolean> {
    const { query, order } = context;

    await this.searchEngineQueryService.applyWithNaatiLevelsThreeAndFourCondition(
      query,
      order.scheduledStartTime,
      order.scheduledEndTime,
    );

    if (!(await this.hasResults(query))) {
      return false;
    }

    return true;
  }

  public async applyStepWithNaatiThirdAndFourthLevelIgnoreFreeSlot(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<boolean> {
    const { query } = context;

    await this.searchEngineQueryService.applyWithNaatiLevelsThreeAndFourIgnoreFreeSlotCondition(query);

    if (!(await this.hasResults(query))) {
      return false;
    }

    return true;
  }

  public async applyStepWithoutNaatiFirstLevelIgnoreFreeSlot(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<boolean> {
    const { query, order, orderType } = context;

    if (order.topic === EAppointmentTopic.LEGAL || order.topic === EAppointmentTopic.MEDICAL) {
      const message = `Step 6.1: ${orderType}: No available interpreters without NAATI Level 1, ignore free slots.`;
      await this.searchEngineQueryService.applyWithoutNaatiFirstLevelIgnoreFreeSlotCondition(query);

      if (!(await this.hasResults(query, message))) {
        await this.setRedFlag(order, orderType, message);

        return false;
      }
    }

    return true;
  }

  public async applyStepFreeSlots(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType, setRedFlags } = context;
    const message = `Step 7: ${orderType}: No available interpreters with free slots.`;
    await this.searchEngineQueryService.applyFreeSlotCondition(query, order.scheduledStartTime, order.scheduledEndTime);

    if (!(await this.hasResults(query, message))) {
      if (setRedFlags) {
        await this.setRedFlag(order, orderType, message);
      }

      return false;
    }

    return true;
  }

  public async applyStepWithoutNaatiFirstLevelOrFreeSlot(
    context: ISearchContextBase | IGroupSearchContext,
  ): Promise<boolean> {
    const { query, order, orderType } = context;

    if (order.topic === EAppointmentTopic.LEGAL || order.topic === EAppointmentTopic.MEDICAL) {
      const message = `Step 6: ${orderType}: No available interpreters without NAATI Level 1, with free slots.`;
      await this.searchEngineQueryService.applyWithoutNaatiFirstLevelCondition(
        query,
        order.scheduledStartTime,
        order.scheduledEndTime,
      );

      if (!(await this.hasResults(query, message))) {
        await this.setRedFlag(order, orderType, message);

        return false;
      }
    } else {
      const message = `Step 7: ${orderType}: No available interpreters with free slots.`;
      await this.searchEngineQueryService.applyFreeSlotCondition(
        query,
        order.scheduledStartTime,
        order.scheduledEndTime,
      );

      if (!(await this.hasResults(query, message))) {
        await this.setRedFlag(order, orderType, message);

        return false;
      }
    }

    return true;
  }

  public async applyStepBlacklist(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType } = context;
    const { clientId } = order.appointment;

    if (!clientId) {
      this.lokiLogger.error(`No client id in order with Id: ${order.id}. Can't apply blacklist condition. Skipping.`);

      return false;
    }

    const message = `Step 8: ${orderType}: No available interpreters without blacklist.`;
    await this.searchEngineQueryService.applyBlacklistCondition(query, clientId);

    if (!(await this.hasResults(query, message))) {
      await this.setRedFlag(order, orderType, message);

      return false;
    }

    return true;
  }

  public async applyStepTimeZoneRate(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, order, orderType } = context;

    const message = `Step 9: ${orderType}: No available interpreters without timezone rates.`;
    await this.searchEngineQueryService.applyTimeZoneRateConditions(
      query,
      order.scheduledStartTime,
      order.scheduledEndTime,
    );

    if (!(await this.hasResults(query, message))) {
      await this.setRedFlag(order, orderType, message);

      return false;
    }

    return true;
  }

  public async finalStep(context: ISearchContextBase | IGroupSearchContext): Promise<boolean> {
    const { query, setRedFlags } = context;
    const availableInterpretersIds: { userRole_id: string }[] = await query.getRawMany();

    if (availableInterpretersIds.length === 0) {
      if (setRedFlags) {
        const message = "Final Step: Failed to get a list of available interpreters";
        await this.setRedFlag(context.order, context.orderType, message);
      }

      return false;
    }

    await this.finishSearchEngine(context, availableInterpretersIds);

    return true;
  }

  private async hasResults(query: SelectQueryBuilder<InterpreterProfile>, errorMessage?: string): Promise<boolean> {
    const count = await query.getCount();

    if (count === 0) {
      if (ENVIRONMENT !== EEnvironment.PRODUCTION && errorMessage) {
        this.lokiLogger.warn(errorMessage);
      }

      return false;
    }

    return true;
  }

  private async sendChangeNotificationToClient(
    order: AppointmentOrder,
    notificationSearchType: EOrderChangeNotificationType,
  ): Promise<void> {
    const { id, platformId, clientId } = order.appointment;

    if (!clientId) {
      this.lokiLogger.error("No client id in order. Can't send notification. Skipping.");

      return;
    }

    switch (notificationSearchType) {
      case EOrderChangeNotificationType.TOPIC:
        await this.searchEngineNotificationService.sendSearchClientNotificationCaseTopic(clientId, platformId, {
          appointmentId: id,
          topic: EAppointmentTopic.GENERAL,
        });
        break;

      case EOrderChangeNotificationType.GENDER_AND_TOPIC:
        await this.searchEngineNotificationService.sendSearchClientNotificationCaseGenderAndTopic(
          clientId,
          platformId,
          {
            appointmentId: id,
            topic: EAppointmentTopic.GENERAL,
            preferredInterpreterGender: "null",
          },
        );
        break;

      case EOrderChangeNotificationType.GENDER:
        await this.searchEngineNotificationService.sendSearchClientNotificationCaseGender(clientId, platformId, {
          appointmentId: id,
          preferredInterpreterGender: "null",
        });
        break;
    }

    return;
  }

  private async setRedFlag(
    order: AppointmentOrder,
    orderType: EAppointmentSchedulingType,
    errorMessage: string,
  ): Promise<void> {
    if (!order.appointment.appointmentAdminInfo) {
      this.lokiLogger.error(`${orderType} order with id: ${order.id}, not have admin info`);

      return;
    }

    const lfhAdmins = await this.helperService.getAllLfhAdmins();
    const { id } = order.appointment.appointmentAdminInfo;
    await this.enableRedFlagWithMessage(id, errorMessage);
    await this.searchEngineNotificationService.sendNotificationToAdmins(lfhAdmins, order.appointment.platformId, {
      appointmentId: order.appointment.id,
    });
  }

  private async finishSearchEngine(
    context: ISearchContextBase | IGroupSearchContext,
    availableInterpretersIds: { userRole_id: string }[],
  ): Promise<void> {
    const matchedConditionInterpreterIds: string[] = [];

    const { invitation, notificationFunctionType, entityToUpdate, repositoryToUpdate } =
      await this.buildInvitationAndNotificationDetails(context);

    for (const interpreter of availableInterpretersIds) {
      this.sendSearchEngineNotification(
        interpreter.userRole_id,
        entityToUpdate.platformId,
        invitation,
        notificationFunctionType,
      );
      matchedConditionInterpreterIds.push(interpreter.userRole_id);
    }

    await repositoryToUpdate.update(
      { id: entityToUpdate.id },
      {
        matchedInterpreterIds: matchedConditionInterpreterIds,
        isFirstSearchCompleted: context.isFirstSearchCompleted,
        isSecondSearchCompleted: context.isSecondSearchCompleted,
        isSearchNeeded: context.isSearchNeeded,
        timeToRestart: context.timeToRestart,
      },
    );
    await this.redisService.del(context.cacheKey);
  }

  private sendSearchEngineNotification(
    interpreterId: string,
    platformId: string,
    invitation: IAppointmentOrderInvitationOutput | IOnDemandInvitationOutput,
    notificationFunctionType: ESearchEngineNotificationFlow,
  ): void {
    switch (notificationFunctionType) {
      case ESearchEngineNotificationFlow.ON_DEMAND_INVITATION:
        void this.searchEngineNotificationService.sendOnDemandNotification(
          interpreterId,
          platformId,
          invitation as IOnDemandInvitationOutput,
        );
        break;
      case ESearchEngineNotificationFlow.ORDER_INVITATION:
        void this.searchEngineNotificationService.sendSingleNotification(
          interpreterId,
          platformId,
          invitation as IAppointmentOrderInvitationOutput,
        );
        break;
      case ESearchEngineNotificationFlow.ORDER_GROUP_INVITATION:
        void this.searchEngineNotificationService.sendGroupNotification(
          interpreterId,
          platformId,
          invitation as IAppointmentOrderInvitationOutput,
        );

        break;
    }
  }

  private async buildInvitationAndNotificationDetails(context: ISearchContextBase | IGroupSearchContext): Promise<{
    invitation: IAppointmentOrderInvitationOutput | IOnDemandInvitationOutput;
    notificationFunctionType: ESearchEngineNotificationFlow;
    entityToUpdate: AppointmentOrder | AppointmentOrderGroup;
    repositoryToUpdate: Repository<AppointmentOrder | AppointmentOrderGroup>;
  }> {
    const { order, orderType } = context;

    if (orderType === EAppointmentSchedulingType.ON_DEMAND) {
      return await this.buildOnDemandDetails(order);
    } else {
      if (this.isGroupContext(context)) {
        return await this.buildPreBookedDetails(order, context.group);
      } else {
        return await this.buildPreBookedDetails(order);
      }
    }
  }

  private isGroupContext(context: ISearchContextBase | IGroupSearchContext): context is IGroupSearchContext {
    return "group" in context && !!context.group;
  }

  private async buildOnDemandDetails(order: AppointmentOrder): Promise<{
    invitation: IAppointmentOrderInvitationOutput | IOnDemandInvitationOutput;
    notificationFunctionType: ESearchEngineNotificationFlow;
    entityToUpdate: AppointmentOrder;
    repositoryToUpdate: Repository<AppointmentOrder>;
  }> {
    const INVITATION_LINK = `${this.BACK_END_URL}/v1/appointment-orders/accept/on-demand/${order.id}`;

    if (order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      const invitation: IAppointmentOrderInvitationOutput = {
        appointmentOrderId: order.id,
      };
      const notificationFunctionType = ESearchEngineNotificationFlow.ORDER_INVITATION;

      return {
        invitation,
        notificationFunctionType,
        entityToUpdate: order,
        repositoryToUpdate: this.appointmentOrderRepository,
      };
    } else {
      const invitation: IOnDemandInvitationOutput = {
        invitationLink: INVITATION_LINK,
        appointmentOrderId: order.id,
        appointmentId: order.appointment.id,
        clientName: order.clientPreferredName || order.clientFirstName,
        clientPlatformId: order.clientPlatformId,
        clientCompanyName: order.operatedByCompanyName,
        schedulingDurationMin: order.schedulingDurationMin,
        communicationType: order.communicationType,
        topic: order.topic,
        languageFrom: order.languageFrom,
        languageTo: order.languageTo,
      };
      const notificationFunctionType = ESearchEngineNotificationFlow.ON_DEMAND_INVITATION;

      return {
        invitation,
        notificationFunctionType,
        entityToUpdate: order,
        repositoryToUpdate: this.appointmentOrderRepository,
      };
    }
  }

  private async buildPreBookedDetails(
    order: AppointmentOrder,
    group?: AppointmentOrderGroup,
  ): Promise<{
    invitation: IAppointmentOrderInvitationOutput;
    notificationFunctionType: ESearchEngineNotificationFlow;
    entityToUpdate: AppointmentOrder | AppointmentOrderGroup;
    repositoryToUpdate: Repository<AppointmentOrder | AppointmentOrderGroup>;
  }> {
    const isOrderGroup = !!group;

    const invitation: IAppointmentOrderInvitationOutput = {
      appointmentOrderId: isOrderGroup ? UNDEFINED_VALUE : order.id,
      appointmentOrderGroupId: isOrderGroup ? group.id : UNDEFINED_VALUE,
    };

    const notificationFunctionType = isOrderGroup
      ? ESearchEngineNotificationFlow.ORDER_GROUP_INVITATION
      : ESearchEngineNotificationFlow.ORDER_INVITATION;

    const entityToUpdate = isOrderGroup ? group : order;
    const repositoryToUpdate = isOrderGroup ? this.appointmentOrderGroupRepository : this.appointmentOrderRepository;

    return {
      invitation,
      notificationFunctionType,
      entityToUpdate,
      repositoryToUpdate,
    };
  }

  private async enableRedFlagWithMessage(id: string, message: string): Promise<void> {
    await this.appointmentAdminInfoRepository.update(id, {
      isRedFlagEnabled: true,
      message: message,
    });
  }
}
