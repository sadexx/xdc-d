import { Injectable } from "@nestjs/common";
import {
  ArrayContains,
  Brackets,
  FindManyOptions,
  FindOneOptions,
  FindOptionsSelect,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Not,
  ObjectLiteral,
  SelectQueryBuilder,
} from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import {
  GetAllAppointmentOrdersDto,
  GetAllListInterpretersDto,
} from "src/modules/appointment-orders/appointment-order/common/dto";
import { generateCaseForEnumOrder, isInRoles } from "src/common/utils";
import {
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentSchedulingTypeOrder,
  appointmentTopicOrder,
  EAppointmentInterpretingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { languageOrder } from "src/modules/interpreters/profile/common/enum";
import { UserRole } from "src/modules/users/entities";
import { ESortOrder } from "src/common/enums";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES } from "src/common/constants";
import { GetInterpretersQuery } from "src/modules/appointment-orders/appointment-order/common/types";

@Injectable()
export class AppointmentOrderQueryOptionsService {
  /**
   ** AppointmentOrderCommandService
   */

  public getInterpreterOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      where: { id: userRoleId },
      relations: {
        interpreterProfile: true,
        role: true,
        profile: true,
        user: true,
      },
    };
  }

  public getInterpretersOptions(userRoleIds: string[]): FindManyOptions<UserRole> {
    return {
      select: GetInterpretersQuery.select,
      where: { id: In(userRoleIds) },
      relations: GetInterpretersQuery.relations,
    };
  }

  public getAppointmentOrderOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        schedulingType: true,
        platformId: true,
        matchedInterpreterIds: true,
        appointment: {
          id: true,
          clientId: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          appointmentsGroupId: true,
          platformId: true,
          communicationType: true,
          alternativePlatform: true,
          languageFrom: true,
          languageTo: true,
          topic: true,
          schedulingDurationMin: true,
          client: {
            id: true,
            instanceUserArn: true,
            operatedByCompanyId: true,
            operatedByMainCorporateCompanyId: true,
            role: {
              id: true,
              name: true,
            },
            profile: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          appointmentAdminInfo: {
            id: true,
            isRedFlagEnabled: true,
          },
        },
        appointmentOrderGroup: {
          id: true,
          sameInterpreter: true,
        },
      },
      where: { id: id },
      relations: {
        appointment: { client: { role: true, profile: true }, appointmentAdminInfo: true },
        appointmentOrderGroup: true,
      },
    };
  }

  public getAppointmentOrderGroupOptions(id: string): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        appointmentOrders: {
          id: true,
          schedulingType: true,
          platformId: true,
          matchedInterpreterIds: true,
          appointment: {
            id: true,
            clientId: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
            appointmentsGroupId: true,
            platformId: true,
            communicationType: true,
            alternativePlatform: true,
            languageFrom: true,
            languageTo: true,
            topic: true,
            schedulingDurationMin: true,
            client: {
              id: true,
              instanceUserArn: true,
              operatedByCompanyId: true,
              operatedByMainCorporateCompanyId: true,
              role: {
                id: true,
                name: true,
              },
              profile: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            appointmentAdminInfo: {
              id: true,
              isRedFlagEnabled: true,
            },
          },
          appointmentOrderGroup: {
            id: true,
            sameInterpreter: true,
          },
        },
      },
      where: { id: id },
      relations: {
        appointmentOrders: {
          appointment: {
            client: {
              role: true,
              profile: true,
              user: true,
            },
            appointmentAdminInfo: true,
          },
        },
      },
    };
  }

  public getDeleteAppointmentOrderGroupOptions(id: string, isPlatform: boolean): FindOneOptions<AppointmentOrderGroup> {
    return {
      where: isPlatform ? { platformId: id } : { id: id },
      relations: {
        appointmentOrders: true,
      },
    };
  }

  public getRejectAppointmentOrderOptions(id: string, interpreterId: string): FindOneOptions<AppointmentOrder> {
    return {
      where: { id, matchedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getRejectAppointmentOrderGroupOptions(
    id: string,
    interpreterId: string,
  ): FindOneOptions<AppointmentOrderGroup> {
    return {
      where: { id, matchedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getRefuseAppointmentOrderOptions(id: string, interpreterId: string): FindOneOptions<AppointmentOrder> {
    return {
      where: { id, rejectedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getRefuseAppointmentOrderGroupOptions(
    id: string,
    interpreterId: string,
  ): FindOneOptions<AppointmentOrderGroup> {
    return {
      where: { id, rejectedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getSharedOrderForRepeatAndAddInterpreterOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        platformId: true,
        matchedInterpreterIds: true,
        schedulingType: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        acceptOvertimeRates: true,
        timezone: true,
      },
      where: {
        appointment: { id: id },
        isOrderGroup: false,
      },
    };
  }

  public getOrderGroupRepeatNotificationOptions(platformId: string): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        matchedInterpreterIds: true,
      },
      where: {
        platformId: platformId,
      },
    };
  }

  public configureClosestAppointmentOrderSubQuery(
    queryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    platformId: string,
  ): SelectQueryBuilder<AppointmentOrderGroup> {
    return queryBuilder
      .innerJoin("group.appointmentOrders", "order")
      .where("group.platformId = :platformId", { platformId })
      .andWhere("order.isOrderGroup = true")
      .orderBy("order.scheduledStartTime", ESortOrder.ASC)
      .limit(1)
      .select("order.id");
  }

  public configureAppointmentOrderGroupWithClosestAppointmentQuery(
    queryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    subQuery: string,
    platformId: string,
    subQueryParameters: ObjectLiteral,
  ): SelectQueryBuilder<AppointmentOrderGroup> {
    return queryBuilder
      .leftJoinAndSelect("group.appointmentOrders", "order", `order.id = (${subQuery})`)
      .setParameters(subQueryParameters)
      .where("group.platformId = :platformId", { platformId });
  }

  public getAddInterpreterToOrderOptions(id: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
      },
      where: {
        id: id,
      },
    };
  }

  /**
   ** AppointmentOrderExpirationCancelService
   */
  public getCancelAppointmentBySystemOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        clientId: true,
        schedulingType: true,
        communicationType: true,
        isGroupAppointment: true,
        alternativePlatform: true,
        platformId: true,
        appointmentReminder: {
          id: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          chimeMeetingId: true,
          appointmentId: true,
          attendees: {
            id: true,
          },
        },
        client: {
          id: true,
          user: {
            id: true,
            email: true,
            platformId: true,
          },
          profile: {
            id: true,
            firstName: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
      },
      where: { id: id, isGroupAppointment: false },
      relations: {
        appointmentReminder: true,
        appointmentAdminInfo: true,
        chimeMeetingConfiguration: { attendees: true },
        client: { user: true, profile: true, role: true },
      },
    };
  }

  public getCancelAppointmentOrderGroup(platformId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        clientId: true,
        interpreterId: true,
        communicationType: true,
        appointmentsGroupId: true,
        isGroupAppointment: true,
        alternativePlatform: true,
        platformId: true,
        appointmentReminder: {
          id: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          attendees: {
            id: true,
          },
        },
        appointmentOrder: {
          id: true,
        },
        client: {
          id: true,
          user: {
            id: true,
            email: true,
            platformId: true,
          },
          profile: {
            id: true,
            firstName: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
        interpreter: {
          id: true,
        },
      },
      where: { appointmentsGroupId: platformId, isGroupAppointment: true },
      relations: {
        appointmentReminder: true,
        appointmentAdminInfo: true,
        chimeMeetingConfiguration: { attendees: true },
        appointmentOrder: true,
        client: { user: true, profile: true, role: true },
        interpreter: true,
      },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  /**
   ** AppointmentOrderQueryService
   */

  public getAllAppointmentOrdersOptions(
    queryBuilder: SelectQueryBuilder<AppointmentOrder>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    queryBuilder
      .select([
        "appointmentOrder.id",
        "appointmentOrder.platformId",
        "appointmentOrder.scheduledStartTime",
        "appointmentOrder.scheduledEndTime",
        "appointmentOrder.isOrderGroup",
        "appointmentOrder.appointmentOrderGroupId",
        "appointmentOrder.interpreterType",
        "appointmentOrder.interpretingType",
        "appointmentOrder.schedulingType",
        "appointmentOrder.communicationType",
        "appointmentOrder.languageFrom",
        "appointmentOrder.languageTo",
        "appointmentOrder.schedulingDurationMin",
        "appointmentOrder.topic",
        "appointmentOrder.clientFirstName",
        "appointmentOrder.clientPreferredName",
        "appointmentOrder.clientLastName",
        "appointmentOrder.clientPlatformId",
        "appointmentOrder.address",
        "appointmentOrder.creationDate",
      ])
      .leftJoin("appointmentOrder.appointment", "appointment")
      .addSelect(["appointment.id", "appointment.sameInterpreter"])
      .andWhere("appointmentOrder.isOrderGroup = :isOrderGroup", { isOrderGroup: false });

    this.applyFilters(queryBuilder, dto);
    this.applyOrderingForAppointmentOrder(queryBuilder, dto);
  }

  public getAllAppointmentOrderGroupsOptions(
    queryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    queryBuilder
      .select([
        "appointmentOrderGroup.id",
        "appointmentOrderGroup.platformId",
        "appointmentOrderGroup.sameInterpreter",
        "appointmentOrderGroup.creationDate",
      ])
      .leftJoin("appointmentOrderGroup.appointmentOrders", "appointmentOrder")
      .addSelect([
        "appointmentOrder.id",
        "appointmentOrder.platformId",
        "appointmentOrder.scheduledStartTime",
        "appointmentOrder.scheduledEndTime",
        "appointmentOrder.isOrderGroup",
        "appointmentOrder.appointmentOrderGroupId",
        "appointmentOrder.interpreterType",
        "appointmentOrder.interpretingType",
        "appointmentOrder.schedulingType",
        "appointmentOrder.communicationType",
        "appointmentOrder.languageFrom",
        "appointmentOrder.languageTo",
        "appointmentOrder.schedulingDurationMin",
        "appointmentOrder.topic",
        "appointmentOrder.clientFirstName",
        "appointmentOrder.clientPreferredName",
        "appointmentOrder.clientLastName",
        "appointmentOrder.clientPlatformId",
        "appointmentOrder.address",
        "appointmentOrder.creationDate",
      ])
      .leftJoin("appointmentOrder.appointment", "appointment")
      .addSelect(["appointment.id", "appointment.sameInterpreter"])
      .andWhere("appointmentOrder.isOrderGroup = :isOrderGroup", { isOrderGroup: true });

    this.applyFilters(queryBuilder, dto);
    this.applyOrderingForAppointmentOrderGroup(queryBuilder, dto);
  }

  public applyFiltersForCompanyAppointmentOrders(
    individualQueryBuilder: SelectQueryBuilder<AppointmentOrder>,
    groupQueryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    adminUserRole: UserRole,
  ): void {
    const INDIVIDUAL_ORDERS_LIMIT = 250;
    const GROUP_ORDERS_LIMIT = 50;

    const filterColumn = isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, adminUserRole.role.name)
      ? "user_roles.operated_by_main_corporate_company_id"
      : "user_roles.operated_by_company_id";

    const queryOptions = (alias: string): string =>
      `EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_roles.id = ANY(${alias}.matchedInterpreterIds)
        AND ${filterColumn} = :operatedByCompanyId
      )
      OR EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_roles.id = ANY(${alias}.rejectedInterpreterIds)
        AND ${filterColumn} = :operatedByCompanyId
      )`;

    individualQueryBuilder
      .andWhere(queryOptions(individualQueryBuilder.alias), { operatedByCompanyId: adminUserRole.operatedByCompanyId })
      .take(INDIVIDUAL_ORDERS_LIMIT);
    groupQueryBuilder
      .andWhere(queryOptions(groupQueryBuilder.alias), { operatedByCompanyId: adminUserRole.operatedByCompanyId })
      .take(GROUP_ORDERS_LIMIT);
  }

  public applyFiltersForMatchedAppointmentOrders(
    individualQueryBuilder: SelectQueryBuilder<AppointmentOrder>,
    groupQueryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    userRoleId: string,
  ): void {
    individualQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.matchedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.rejectedInterpreterIds)", { userRoleId });
    groupQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.matchedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.rejectedInterpreterIds)", { userRoleId });
  }

  public applyFiltersForRejectedAppointmentOrders(
    individualQueryBuilder: SelectQueryBuilder<AppointmentOrder>,
    groupQueryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    userRoleId: string,
  ): void {
    individualQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.rejectedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.matchedInterpreterIds)", { userRoleId });
    groupQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.rejectedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.matchedInterpreterIds)", { userRoleId });
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AppointmentOrder | AppointmentOrderGroup>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("appointmentOrder.schedulingType IN (:...schedulingTypes)", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("appointmentOrder.interpretingType IN (:...interpretingTypes)", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("appointmentOrder.topic IN (:...topics)", { topics: dto.topics });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("appointmentOrder.communicationType IN (:...communicationTypes)", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("appointmentOrder.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("appointmentOrder.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.schedulingDurationMin) {
      queryBuilder.andWhere("appointmentOrder.schedulingDurationMin = :schedulingDurationMin", {
        schedulingDurationMin: dto.schedulingDurationMin,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere(`DATE(appointmentOrder.scheduledStartTime) BETWEEN :startDate::date AND :endDate::date`, {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }
  }

  private applySearch(
    queryBuilder: SelectQueryBuilder<AppointmentOrder | AppointmentOrderGroup>,
    searchField: string,
  ): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointmentOrder.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointmentOrder.languageFrom, ' - ', appointmentOrder.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("appointmentOrder.clientPlatformId ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("appointmentOrder"."client_preferred_name", "appointmentOrder"."client_first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("appointmentOrder.clientLastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrderingForAppointmentOrder(
    queryBuilder: SelectQueryBuilder<AppointmentOrder>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.schedulingType",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.communicationType",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.interpretingType",
        appointmentInterpretingTypeOrder,
      );

      queryBuilder.addSelect(schedulingTypeCase, "scheduling_type_order");
      queryBuilder.addSelect(communicationTypeCase, "communication_type_order");
      queryBuilder.addSelect(interpretingTypeCase, "interpreting_type_order");

      queryBuilder.addOrderBy("scheduling_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("communication_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("interpreting_type_order", dto.schedulingTypeOrder);
    }

    if (dto.topicOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("appointmentOrder.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("appointmentOrder.platformId", dto.platformIdOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("appointmentOrder.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("appointmentOrder.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder
        .addSelect(
          `COALESCE("appointmentOrder"."client_preferred_name", "appointmentOrder"."client_first_name")`,
          "client_name_sort",
        )
        .addOrderBy("client_name_sort", dto.clientFirstNameOrder);
    }
  }

  private applyOrderingForAppointmentOrderGroup(
    queryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.schedulingType",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.communicationType",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.interpretingType",
        appointmentInterpretingTypeOrder,
      );

      queryBuilder.addSelect(schedulingTypeCase, "scheduling_type_order");
      queryBuilder.addSelect(communicationTypeCase, "communication_type_order");
      queryBuilder.addSelect(interpretingTypeCase, "interpreting_type_order");

      queryBuilder.addOrderBy("scheduling_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("communication_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("interpreting_type_order", dto.schedulingTypeOrder);
    }

    if (dto.topicOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("appointmentOrderGroup.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("appointmentOrderGroup.platformId", dto.platformIdOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("appointmentOrder.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("appointmentOrder.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder
        .addSelect(
          `COALESCE("appointmentOrder"."client_preferred_name", "appointmentOrder"."client_first_name")`,
          "client_name_sort",
        )
        .addOrderBy("client_name_sort", dto.clientFirstNameOrder);
    }
  }

  public getAppointmentOrderByIdOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        appointment: {
          id: true,
          sameInterpreter: true,
          participants: true,
          client: {
            id: true,
            role: {
              name: true,
            },
            profile: {
              firstName: true,
              preferredName: true,
              lastName: true,
              gender: true,
            },
            user: {
              platformId: true,
              avatarUrl: true,
            },
          },
        },
      },
      where: { id },
      relations: {
        appointment: {
          participants: true,
          client: {
            user: true,
            role: true,
            profile: true,
          },
        },
      },
    };
  }

  public getOrdersInGroupByIdOptions(id: string): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        appointmentOrders: {
          id: true,
          platformId: true,
          appointmentOrderGroupId: true,
          isOrderGroup: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          communicationType: true,
          schedulingType: true,
          schedulingDurationMin: true,
          topic: true,
          interpreterType: true,
          interpretingType: true,
          languageFrom: true,
          languageTo: true,
          clientPlatformId: true,
          clientFirstName: true,
          clientPreferredName: true,
          clientLastName: true,
          participantType: true,
          operatedByCompanyName: true,
          appointment: {
            id: true,
            sameInterpreter: true,
            client: {
              id: true,
              role: {
                name: true,
              },
              profile: {
                firstName: true,
                preferredName: true,
                lastName: true,
                gender: true,
              },
              user: {
                platformId: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      where: { id },
      relations: {
        appointmentOrders: {
          appointment: {
            client: {
              user: true,
              profile: true,
              role: true,
            },
          },
        },
      },
    };
  }

  public getListOfInterpretersReceivedOrderOptions(
    appointmentId: string,
    dto: GetAllListInterpretersDto,
  ): { query: string; parameters: (string | number)[] } {
    return this.getListOfInterpretersReceivedOrderOptionsGeneric(
      "appointment_orders",
      "appointment_id",
      "AND is_order_group = false",
      appointmentId,
      dto,
    );
  }

  public getListOfInterpretersReceivedOrderGroupOptions(
    groupId: string,
    dto: GetAllListInterpretersDto,
  ): { query: string; parameters: (string | number)[] } {
    return this.getListOfInterpretersReceivedOrderOptionsGeneric(
      "appointment_order_groups",
      "platform_id",
      "",
      groupId,
      dto,
    );
  }

  /**
   * The query will return a list of interpreters that received an order, either
   * ignored or declined the order. The list will be ordered by the userRole.id
   * field. The query will also return the total count of records.
   *
   * @param {string} tableName The name of the table to query. Either "appointment_orders" or "appointment_order_groups".
   * @param {string} idColumn The name of the column to use for the WHERE clause. Either "appointment_id" or "platform_id".
   * @param {string} extraWhere An extra WHERE clause to add to the query.
   * @param {string} orderId The value for the WHERE clause.
   * @param {GetAllListInterpretersDto} dto The pagination options.
   *
   * @returns {{ query: string, parameters: (string | number)[] }}
   */
  public getListOfInterpretersReceivedOrderOptionsGeneric(
    tableName: string,
    idColumn: string,
    extraWhere: string,
    orderId: string,
    dto: GetAllListInterpretersDto,
  ): { query: string; parameters: (string | number)[] } {
    const interpreterJsonBuild: string = `
    json_build_object(
      'id', interpreter_profiles.id,
      'userRole', json_build_object(
        'id', user_roles.id,
        'country', user_roles.country,
        'operatedByCompanyId', user_roles.operated_by_company_id,
        'operatedByCompanyName', user_roles.operated_by_company_name,
        'user', json_build_object(
          'platformId', users.platform_id
        ),
        'profile', json_build_object(
          'firstName', user_profiles.first_name,
          'preferredName', user_profiles.preferred_name,
          'lastName', user_profiles.last_name
        )
      ),
      'knownLevels', interpreter_profiles.known_levels,
      'endOfWorkDay', interpreter_profiles.end_of_work_day,
      'onlineSince', interpreter_profiles.online_since,
      'offlineSince', interpreter_profiles.offline_since
    ) AS interpreter
  `;

    const fromAndJoins: string = `
    FROM interpreter_profiles
    CROSS JOIN appointment
    LEFT JOIN user_roles ON interpreter_profiles.user_role_id = user_roles.id
    LEFT JOIN users ON user_roles.user_id = users.id
    LEFT JOIN user_profiles ON user_profiles.user_role_id = user_roles.id
  `;

    const query: string = `
    WITH appointment AS (
      SELECT matched_interpreter_ids, rejected_interpreter_ids
      FROM ${tableName}
      WHERE ${idColumn} = $3
      ${extraWhere}
    ),
    ignored AS (
      SELECT
        'ignored' AS type,
        interpreter_profiles.id AS ordering,
        ${interpreterJsonBuild}
      ${fromAndJoins}
      WHERE interpreter_profiles.user_role_id = ANY(appointment.matched_interpreter_ids)
    ),
    declined AS (
      SELECT
        'declined' AS type,
        interpreter_profiles.id AS ordering,
        ${interpreterJsonBuild}
      ${fromAndJoins}
      WHERE interpreter_profiles.user_role_id = ANY(appointment.rejected_interpreter_ids)
    ),
    combined AS (
      SELECT * FROM ignored
      UNION ALL
      SELECT * FROM declined
    )
    SELECT json_build_object(
      'data', json_agg(temp_record),
      'total', (SELECT COUNT(*) FROM combined)
    ) AS result
    FROM (
      SELECT type, interpreter
      FROM combined
      ORDER BY ordering
      LIMIT $1 OFFSET $2
    ) AS temp_record;
  `;

    return {
      query,
      parameters: [dto.limit, dto.offset, orderId],
    };
  }

  public getNewOrderForWebSocketOptions(lastChecked: Date): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        platformId: true,
        scheduledStartTime: true,
        isOrderGroup: true,
        appointmentOrderGroupId: true,
        interpretingType: true,
        schedulingType: true,
        communicationType: true,
        languageFrom: true,
        languageTo: true,
        schedulingDurationMin: true,
        topic: true,
        clientFirstName: true,
        clientPreferredName: true,
        clientLastName: true,
        clientPlatformId: true,
        matchedInterpreterIds: true,
        rejectedInterpreterIds: true,
        appointment: {
          id: true,
        },
      },
      where: { isOrderGroup: false, creationDate: MoreThan(lastChecked) },
      order: { creationDate: ESortOrder.ASC },
      relations: { appointment: true },
    };
  }

  public getNewOrdersForWebSocketOptions(lastChecked: Date): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        matchedInterpreterIds: true,
        rejectedInterpreterIds: true,
        appointmentOrders: {
          id: true,
          platformId: true,
          scheduledStartTime: true,
          isOrderGroup: true,
          appointmentOrderGroupId: true,
          interpretingType: true,
          schedulingType: true,
          communicationType: true,
          languageFrom: true,
          languageTo: true,
          schedulingDurationMin: true,
          topic: true,
          clientFirstName: true,
          clientPreferredName: true,
          clientLastName: true,
          clientPlatformId: true,
          appointment: {
            id: true,
          },
        },
      },
      where: { appointmentOrders: { isOrderGroup: true }, creationDate: MoreThan(lastChecked) },
      relations: { appointmentOrders: { appointment: true } },
    };
  }

  /**
   ** AppointmentOrderRecreationService
   */

  public getFullGroupRecreationOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        appointmentsGroupId: true,
        sameInterpreter: true,
        acceptOvertimeRates: true,
        platformId: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        communicationType: true,
        schedulingType: true,
        schedulingDurationMin: true,
        topic: true,
        preferredInterpreterGender: true,
        interpreterType: true,
        interpretingType: true,
        languageFrom: true,
        languageTo: true,
        participantType: true,
        timezone: true,
        client: {
          id: true,
          operatedByCompanyName: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyName: true,
          operatedByMainCorporateCompanyId: true,
          timezone: true,
          role: {
            id: true,
            name: true,
          },
          user: {
            id: true,
            platformId: true,
          },
          profile: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        address: {
          id: true,
          latitude: true,
          longitude: true,
          country: true,
          state: true,
          suburb: true,
          streetName: true,
          streetNumber: true,
          postcode: true,
          building: true,
          unit: true,
          timezone: true,
        },
        appointmentOrder: {
          id: true,
          appointmentOrderGroup: {
            id: true,
            appointmentOrders: {
              id: true,
            },
          },
        },
      },
      where: {
        appointmentsGroupId: groupId,
        status: In([EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION, EAppointmentStatus.PENDING]),
      },
      relations: {
        client: { role: true, user: true, profile: true },
        address: true,
        appointmentOrder: {
          appointmentOrderGroup: {
            appointmentOrders: true,
          },
        },
      },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  public getPendingAppointmentsWithoutInterpreterOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        appointmentsGroupId: true,
        sameInterpreter: true,
        acceptOvertimeRates: true,
        platformId: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        communicationType: true,
        schedulingType: true,
        schedulingDurationMin: true,
        topic: true,
        preferredInterpreterGender: true,
        interpreterType: true,
        interpretingType: true,
        languageFrom: true,
        languageTo: true,
        participantType: true,
        timezone: true,
        client: {
          id: true,
          operatedByCompanyName: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyName: true,
          operatedByMainCorporateCompanyId: true,
          timezone: true,
          role: {
            id: true,
            name: true,
          },
          user: {
            id: true,
            platformId: true,
          },
          profile: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        address: {
          id: true,
          latitude: true,
          longitude: true,
          country: true,
          state: true,
          suburb: true,
          streetName: true,
          streetNumber: true,
          postcode: true,
          building: true,
          unit: true,
          timezone: true,
        },
        appointmentOrder: {
          id: true,
          appointmentOrderGroup: {
            id: true,
            appointmentOrders: {
              id: true,
            },
          },
        },
      },
      where: {
        appointmentsGroupId: groupId,
        interpreter: IsNull(),
        status: In([EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION, EAppointmentStatus.PENDING]),
      },
      relations: {
        client: { role: true, user: true, profile: true },
        address: true,
        appointmentOrder: {
          appointmentOrderGroup: {
            appointmentOrders: true,
          },
        },
      },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  /**
   ** OrderSchedulerService
   */

  public getNextRepeatTimeOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: { ...this.getSelectConditionsForNextRepeatTime(), appointment: { id: true } },
      where: {
        isOrderGroup: false,
        nextRepeatTime: LessThanOrEqual(currentTime),
        remainingRepeats: MoreThan(0),
      },
      relations: { appointment: true },
    };
  }

  public getNextRepeatTimeOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: this.getSelectConditionsForNextRepeatTime(),
      where: {
        nextRepeatTime: LessThanOrEqual(currentTime),
        remainingRepeats: MoreThan(0),
      },
    };
  }

  private getSelectConditionsForNextRepeatTime(): FindOptionsSelect<AppointmentOrder | AppointmentOrderGroup> {
    return {
      id: true,
      platformId: true,
      nextRepeatTime: true,
      repeatInterval: true,
      remainingRepeats: true,
      matchedInterpreterIds: true,
    };
  }

  public getNotifyAdminOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        platformId: true,
        isOrderGroup: true,
        notifyAdmin: true,
        appointment: {
          id: true,
        },
      },
      where: {
        isOrderGroup: false,
        notifyAdmin: LessThanOrEqual(currentTime),
      },
      relations: {
        appointment: true,
      },
    };
  }

  public getNotifyAdminOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        notifyAdmin: true,
      },
      where: {
        notifyAdmin: LessThanOrEqual(currentTime),
      },
    };
  }

  public getEndSearchTimeOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        isOrderGroup: true,
        endSearchTime: true,
        appointment: {
          id: true,
        },
      },
      where: {
        isOrderGroup: false,
        endSearchTime: LessThanOrEqual(currentTime),
      },
      relations: {
        appointment: true,
      },
    };
  }

  public getEndSearchTimeOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        sameInterpreter: true,
        endSearchTime: true,
      },
      where: {
        endSearchTime: LessThanOrEqual(currentTime),
      },
    };
  }

  public getSearchEngineTasksOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
      },
      where: [
        {
          isFirstSearchCompleted: false,
          isSearchNeeded: true,
          appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
        },
        {
          isFirstSearchCompleted: true,
          isSecondSearchCompleted: false,
          isSearchNeeded: true,
          timeToRestart: LessThanOrEqual(currentTime),
          appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
        },
      ],
    };
  }

  public getSearchEngineTasksOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
      },
      where: [
        {
          isFirstSearchCompleted: false,
          isSearchNeeded: true,
          appointmentOrders: {
            appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
          },
        },
        {
          isFirstSearchCompleted: true,
          isSecondSearchCompleted: false,
          isSearchNeeded: true,
          timeToRestart: LessThanOrEqual(currentTime),
          appointmentOrders: {
            appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
          },
        },
      ],
    };
  }
}
