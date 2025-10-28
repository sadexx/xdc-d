import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { FindOneOptions, Repository } from "typeorm";
import {
  SearchEngineOnDemandService,
  SearchEnginePreBookGroupService,
  SearchEnginePreBookOrderService,
  SearchEngineStepService,
} from "src/modules/search-engine-logic/services";
import {
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { IGroupSearchContext, ISearchContextBase } from "src/modules/search-engine-logic/common/interface";
import { addMinutes } from "date-fns";
import {
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
  NUMBER_OF_MINUTES_IN_TWO_MINUTES,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";
import { findOneOrFail, findOneOrFailQueryBuilder } from "src/common/utils";
import { ESortOrder } from "src/common/enums";
import { LokiLogger } from "src/common/logger";
import { RedisService } from "src/modules/redis/services";
import { ESearchEngineLogicErrorCodes } from "src/modules/search-engine-logic/common/enum";

@Injectable()
export class SearchEngineLogicService {
  private readonly lokiLogger = new LokiLogger(SearchEngineLogicService.name);
  private readonly CACHE_TTL: number = NUMBER_OF_MINUTES_IN_TWO_MINUTES * NUMBER_OF_SECONDS_IN_MINUTE;

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    private readonly searchEngineOnDemandService: SearchEngineOnDemandService,
    private readonly searchEnginePreBookGroupService: SearchEnginePreBookGroupService,
    private readonly searchEnginePreBookOrderService: SearchEnginePreBookOrderService,
    private readonly searchEngineStepService: SearchEngineStepService,
    private readonly redisService: RedisService,
  ) {}

  public async launchSearchForIndividualOrder(id: string): Promise<void> {
    const cacheKey = `search-engine-order:individual:${id}`;
    const cacheData = await this.redisService.getJson<{ isSearchRunning: boolean }>(cacheKey);

    if (cacheData) {
      return;
    }

    const queryOptions: FindOneOptions<AppointmentOrder> = {
      select: {
        appointment: {
          id: true,
          platformId: true,
          clientId: true,
          appointmentAdminInfo: {
            id: true,
          },
        },
      },
      where: { id: id, appointmentOrderGroup: false },
      relations: { appointment: { appointmentAdminInfo: true } },
    };
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    if (appointmentOrder.interpretingType === EAppointmentInterpretingType.ESCORT) {
      this.lokiLogger.error(`Search engine not applicable for escort interpreting type. Order Id: ${id}`);

      return;
    }

    if (
      appointmentOrder.isFirstSearchCompleted === null ||
      appointmentOrder.isSecondSearchCompleted === null ||
      appointmentOrder.isSearchNeeded === null ||
      appointmentOrder.isCompanyHasInterpreters === null
    ) {
      this.lokiLogger.error(`Failed to start search. Order with Id: ${id} has null flags.`);
      throw new BadRequestException(ESearchEngineLogicErrorCodes.FLAGS_NOT_SET);
    }

    const query = this.searchEngineStepService.initializeQuery();
    const context: ISearchContextBase = {
      cacheKey: cacheKey,
      query: query,
      order: appointmentOrder,
      orderType: appointmentOrder.schedulingType,
      sendNotifications: true,
      setRedFlags: true,
      isFirstSearchCompleted: appointmentOrder.isFirstSearchCompleted,
      isSecondSearchCompleted: appointmentOrder.isSecondSearchCompleted,
      isSearchNeeded: true,
      isCompanyHasInterpreters: appointmentOrder.isCompanyHasInterpreters,
      timeToRestart: null,
      isOrderSaved: false,
    };
    await this.redisService.setJson(cacheKey, { isSearchRunning: true }, this.CACHE_TTL);

    try {
      if (context.orderType === EAppointmentSchedulingType.ON_DEMAND) {
        await this.searchEngineOnDemandService.startSearchEngineOnDemand(context);
      } else {
        await this.searchEnginePreBookOrderService.startSearchEngineForOrder(context);
      }
    } finally {
      if (!context.isOrderSaved) {
        await this.appointmentOrderRepository.update(
          { id: appointmentOrder.id },
          {
            isFirstSearchCompleted: context.isFirstSearchCompleted,
            isSecondSearchCompleted: context.isSecondSearchCompleted,
            isSearchNeeded: context.isSearchNeeded,
            timeToRestart: context.timeToRestart,
          },
        );
        await this.redisService.del(cacheKey);
      }
    }
  }

  public async launchSearchForOrderGroup(id: string): Promise<void> {
    const cacheKey = `search-engine-order:group:${id}`;
    const cacheData = await this.redisService.getJson<{ isSearchRunning: boolean }>(cacheKey);

    if (cacheData) {
      return;
    }

    const subQuery = this.appointmentOrderGroupRepository
      .createQueryBuilder("group")
      .innerJoin("group.appointmentOrders", "order")
      .where("group.id = :id", { id })
      .andWhere("order.isOrderGroup = true")
      .orderBy("order.scheduledStartTime", ESortOrder.ASC)
      .limit(1)
      .select("order.id");

    const queryBuilder = this.appointmentOrderGroupRepository
      .createQueryBuilder("group")
      .leftJoinAndSelect("group.appointmentOrders", "order", "order.id = (" + subQuery.getQuery() + ")")
      .leftJoin("order.appointment", "appointment")
      .leftJoin("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .addSelect(["appointment.id", "appointment.platformId", "appointment.clientId", "appointmentAdminInfo.id"])
      .setParameters(subQuery.getParameters())
      .where("group.id = :id", { id });

    const appointmentOrderGroup = await findOneOrFailQueryBuilder(id, queryBuilder, AppointmentOrderGroup.name);

    if (appointmentOrderGroup.appointmentOrders.length === 0) {
      this.lokiLogger.error(
        `Failed to start search. Appointment orders not found in the AppointmentOrderGroup with Id: ${id}`,
      );
      throw new BadRequestException(ESearchEngineLogicErrorCodes.ORDERS_NOT_FOUND_IN_GROUP);
    }

    const [firstClosestOrder] = appointmentOrderGroup.appointmentOrders;

    if (firstClosestOrder.interpretingType === EAppointmentInterpretingType.ESCORT) {
      this.lokiLogger.error(`Search engine not applicable for escort interpreting type. Order Group Id: ${id}`);

      return;
    }

    const query = this.searchEngineStepService.initializeQuery();
    const context: IGroupSearchContext = {
      cacheKey: cacheKey,
      query: query,
      order: firstClosestOrder,
      group: appointmentOrderGroup,
      orderType: firstClosestOrder.schedulingType,
      sendNotifications: true,
      setRedFlags: true,
      isFirstSearchCompleted: appointmentOrderGroup.isFirstSearchCompleted,
      isSecondSearchCompleted: appointmentOrderGroup.isSecondSearchCompleted,
      isSearchNeeded: true,
      isCompanyHasInterpreters: appointmentOrderGroup.isCompanyHasInterpreters,
      timeToRestart: addMinutes(new Date(), NUMBER_OF_MINUTES_IN_HALF_HOUR),
      isOrderSaved: false,
    };
    await this.redisService.setJson(cacheKey, { isSearchRunning: true }, this.CACHE_TTL);

    try {
      await this.searchEnginePreBookGroupService.startSearchEngineForGroup(context);
    } finally {
      if (!context.isOrderSaved) {
        await this.appointmentOrderGroupRepository.update(
          { id: appointmentOrderGroup.id },
          {
            isFirstSearchCompleted: context.isFirstSearchCompleted,
            isSecondSearchCompleted: context.isSecondSearchCompleted,
            isSearchNeeded: context.isSearchNeeded,
            timeToRestart: context.timeToRestart,
          },
        );
        await this.redisService.del(cacheKey);
      }
    }
  }
}
