import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IMessageOutput } from "src/common/outputs";
import { findManyTyped, findOneOrFail, findOneOrFailQueryBuilder } from "src/common/utils";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders/shared/services";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";
import { UserRole } from "src/modules/users/entities";
import { AddInterpretersToOrderDto } from "src/modules/appointment-orders/appointment-order/common/dto";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { AppointmentOrderNotificationService } from "src/modules/appointment-orders/appointment-order/services";
import { IAppointmentOrderInvitationOutput } from "src/modules/search-engine-logic/common/outputs";
import { TGetInterpreters } from "src/modules/appointment-orders/appointment-order/common/types";

@Injectable()
export class AppointmentOrderInterpreterAdditionService {
  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly appointmentOrderNotificationService: AppointmentOrderNotificationService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
  ) {}

  public async addInterpreterToOrder(id: string, dto: AddInterpretersToOrderDto): Promise<IMessageOutput> {
    const interpretersOptions = this.appointmentOrderQueryOptionsService.getInterpretersOptions(dto.interpreterRoleIds);
    const interpreters = await findManyTyped<TGetInterpreters[]>(this.userRoleRepository, interpretersOptions);

    const appointmentOrderOptions =
      this.appointmentOrderQueryOptionsService.getSharedOrderForRepeatAndAddInterpreterOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, appointmentOrderOptions);

    if (appointmentOrder.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      throw new BadRequestException("The appointment on-demand scheduling type is not permit to add interpreters.");
    }

    const { validInterpreters, interpreterValidationErrors } = await this.batchValidateInterpreters(
      interpreters,
      appointmentOrder,
    );
    await this.updateOrderWithNewValidInterpreters(
      appointmentOrder,
      this.appointmentOrderRepository,
      validInterpreters,
    );

    await this.batchNotifyAddedInterpreters(validInterpreters, appointmentOrder);

    return this.constructAdditionResultMessage(interpreters, validInterpreters, interpreterValidationErrors);
  }

  public async addInterpreterToOrderGroup(platformId: string, dto: AddInterpretersToOrderDto): Promise<IMessageOutput> {
    const interpretersOptions = this.appointmentOrderQueryOptionsService.getInterpretersOptions(dto.interpreterRoleIds);
    const interpreters = await findManyTyped<TGetInterpreters[]>(this.userRoleRepository, interpretersOptions);

    const appointmentOrderGroup = await this.getAppointmentOrderGroupWithClosestAppointment(platformId);

    const { validInterpreters, interpreterValidationErrors } = await this.batchValidateInterpreters(
      interpreters,
      appointmentOrderGroup,
    );
    await this.updateOrderWithNewValidInterpreters(
      appointmentOrderGroup,
      this.appointmentOrderGroupRepository,
      validInterpreters,
    );

    await this.batchNotifyAddedInterpreters(validInterpreters, appointmentOrderGroup);

    return this.constructAdditionResultMessage(interpreters, validInterpreters, interpreterValidationErrors);
  }

  private async batchValidateInterpreters(
    interpreters: TGetInterpreters[],
    entity: AppointmentOrder | AppointmentOrderGroup,
  ): Promise<{ validInterpreters: TGetInterpreters[]; interpreterValidationErrors: Record<string, string> }> {
    const validInterpreters: TGetInterpreters[] = [];
    const interpreterValidationErrors: Record<string, string> = {};

    for (const interpreter of interpreters) {
      const isAlreadyAdded = entity.matchedInterpreterIds.includes(interpreter.id);

      if (isAlreadyAdded) {
        interpreterValidationErrors[interpreter.user.platformId ?? interpreter.id] = "Interpreter is already added";
        continue;
      }

      const { isBlocked, error } = await this.validateInterpreterBlocked(interpreter);

      if (isBlocked) {
        interpreterValidationErrors[interpreter.user.platformId ?? interpreter.id] = error ?? "Interpreter is blocked";
      } else {
        validInterpreters.push(interpreter);
      }
    }

    return { validInterpreters, interpreterValidationErrors };
  }

  private async validateInterpreterBlocked(
    interpreter: TGetInterpreters,
  ): Promise<{ isBlocked: boolean; error?: string }> {
    try {
      await this.appointmentOrderSharedLogicService.checkIfInterpreterIsBlocked(interpreter);

      return { isBlocked: false };
    } catch (error) {
      return { isBlocked: true, error: (error as Error).message };
    }
  }

  private async updateOrderWithNewValidInterpreters(
    entity: AppointmentOrder | AppointmentOrderGroup,
    repository: Repository<AppointmentOrder> | Repository<AppointmentOrderGroup>,
    validInterpreters: TGetInterpreters[],
  ): Promise<void> {
    if (validInterpreters.length === 0) {
      return;
    }

    const newInterpreterIds = validInterpreters.map((interpreter) => interpreter.id);
    await repository.update(entity.id, {
      matchedInterpreterIds: [...entity.matchedInterpreterIds, ...newInterpreterIds],
    });
  }

  private async batchNotifyAddedInterpreters(
    validInterpreters: TGetInterpreters[],
    entity: AppointmentOrder | AppointmentOrderGroup,
  ): Promise<void> {
    const notificationPayload: IAppointmentOrderInvitationOutput = {};

    if (entity instanceof AppointmentOrder) {
      notificationPayload.appointmentOrderId = entity.id;
    } else {
      notificationPayload.appointmentOrderGroupId = entity.id;
    }

    for (const interpreter of validInterpreters) {
      await this.appointmentOrderNotificationService.sendRepeatSingleNotification(
        interpreter.id,
        entity.platformId,
        notificationPayload,
      );
    }
  }

  private constructAdditionResultMessage(
    interpreters: TGetInterpreters[],
    validInterpreters: TGetInterpreters[],
    interpreterValidationErrors: Record<string, string>,
  ): IMessageOutput {
    const successCount = validInterpreters.length;
    const failedCount = interpreters.length - successCount;

    let message = `${successCount} interpreter${successCount > 1 ? "s" : ""} added successfully.`;

    if (failedCount > 0) {
      message += ` ${failedCount} failed.`;

      const errorDetails: string[] = [];

      for (const [interpreterId, error] of Object.entries(interpreterValidationErrors)) {
        errorDetails.push(`${interpreterId}: ${error}`);
      }

      message += ` Details: ${errorDetails.join("; ")}`;
    }

    return { message };
  }

  private async getAppointmentOrderGroupWithClosestAppointment(platformId: string): Promise<AppointmentOrderGroup> {
    const subQuery = this.appointmentOrderGroupRepository.createQueryBuilder("group");
    this.appointmentOrderQueryOptionsService.configureClosestAppointmentOrderSubQuery(subQuery, platformId);

    const queryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("group");
    this.appointmentOrderQueryOptionsService.configureAppointmentOrderGroupWithClosestAppointmentQuery(
      queryBuilder,
      subQuery.getQuery(),
      platformId,
      subQuery.getParameters(),
    );

    const appointmentOrderGroup = await findOneOrFailQueryBuilder(
      platformId,
      queryBuilder,
      AppointmentOrderGroup.name,
      "platformId",
    );

    return appointmentOrderGroup;
  }
}
