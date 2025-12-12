import { Injectable } from "@nestjs/common";
import {
  Between,
  Brackets,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  SelectQueryBuilder,
} from "typeorm";
import { Appointment, AppointmentRating } from "src/modules/appointments/appointment/entities";
import { GetAllAppointmentsDto } from "src/modules/appointments/appointment/common/dto";
import { generateCaseForEnumOrder, isInRoles } from "src/common/utils";
import {
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentSchedulingTypeOrder,
  appointmentStatusOrder,
  appointmentTopicOrder,
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { ESortOrder } from "src/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";
import { languageOrder } from "src/modules/interpreters/profile/common/enum";
import { UserRole } from "src/modules/users/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  CLIENT_ROLES,
  CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
  INTERPRETER_ROLES,
} from "src/common/constants";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments/shared/common/constants";
import { membershipTypeOrder } from "src/modules/memberships/common/enums";
import {
  AppointmentsWithoutClientVisitQuery,
  CheckInOutAlternativePlatformAppointmentUserRoleQuery,
  CheckInOutAppointmentQuery,
  ConfirmExternalInterpreterFoundQuery,
} from "src/modules/appointments/appointment/common/types";

@Injectable()
export class AppointmentQueryOptionsService {
  /**
   ** AppointmentCancelService
   */

  public getCancelAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        status: true,
        communicationType: true,
        clientId: true,
        interpreterId: true,
        isGroupAppointment: true,
        sameInterpreter: true,
        appointmentsGroupId: true,
        platformId: true,
        creationDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        schedulingType: true,
        schedulingDurationMin: true,
        topic: true,
        preferredInterpreterGender: true,
        interpreterType: true,
        interpretingType: true,
        languageFrom: true,
        languageTo: true,
        participantType: true,
        acceptOvertimeRates: true,
        timezone: true,
        client: {
          id: true,
          operatedByCompanyName: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyName: true,
          operatedByMainCorporateCompanyId: true,
          user: {
            id: true,
            platformId: true,
            email: true,
          },
          profile: {
            id: true,
            preferredName: true,
            firstName: true,
            lastName: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
        interpreter: {
          id: true,
          user: {
            id: true,
            platformId: true,
            email: true,
          },
          profile: {
            id: true,
            preferredName: true,
            firstName: true,
            lastName: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
        appointmentReminder: {
          id: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          maxAttendees: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
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
        participants: {
          id: true,
          email: true,
          phoneCode: true,
          phoneNumber: true,
        },
      },
      where: { id: id },
      relations: {
        interpreter: { user: true, profile: true, role: true },
        client: { user: true, profile: true, role: true },
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentAdminInfo: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
        address: true,
        participants: true,
      },
    };
  }

  public getCancelGroupAppointmentsOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        status: true,
        communicationType: true,
        clientId: true,
        interpreterId: true,
        isGroupAppointment: true,
        sameInterpreter: true,
        appointmentsGroupId: true,
        platformId: true,
        creationDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        schedulingType: true,
        schedulingDurationMin: true,
        topic: true,
        preferredInterpreterGender: true,
        interpreterType: true,
        interpretingType: true,
        languageFrom: true,
        languageTo: true,
        participantType: true,
        acceptOvertimeRates: true,
        timezone: true,
        client: {
          id: true,
          operatedByCompanyName: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyName: true,
          operatedByMainCorporateCompanyId: true,
          user: {
            id: true,
            platformId: true,
            email: true,
          },
          profile: {
            id: true,
            preferredName: true,
            firstName: true,
            lastName: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
        interpreter: {
          id: true,
          user: {
            id: true,
            platformId: true,
            email: true,
          },
          profile: {
            id: true,
            preferredName: true,
            firstName: true,
            lastName: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
        appointmentReminder: {
          id: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          maxAttendees: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
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
        participants: {
          id: true,
          email: true,
          phoneCode: true,
          phoneNumber: true,
        },
      },
      where: { appointmentsGroupId: groupId, status: In([EAppointmentStatus.ACCEPTED, EAppointmentStatus.PENDING]) },
      relations: {
        interpreter: { user: true, profile: true, role: true },
        client: { user: true, profile: true, role: true },
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentAdminInfo: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
        address: true,
        participants: true,
      },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  /**
   ** AppointmentCommandService
   */

  public getDeleteAppointmentOptions(id: string, userId: string): FindOneOptions<Appointment> {
    return {
      select: {
        participants: {
          id: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          attendees: {
            id: true,
          },
        },
        appointmentOrder: {
          id: true,
          appointmentOrderGroup: {
            id: true,
          },
        },
        address: {
          id: true,
        },
      },
      where: { id: id, client: { userId: userId } },
      relations: {
        participants: true,
        chimeMeetingConfiguration: {
          attendees: true,
        },
        appointmentOrder: {
          appointmentOrderGroup: true,
        },
        address: true,
      },
    };
  }

  public getArchiveAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      where: { id: id },
      relations: {
        client: true,
        interpreter: true,
      },
    };
  }

  public getSendLateNotificationOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        status: true,
        clientId: true,
        interpreterId: true,
        communicationType: true,
      },
      where: { id },
    };
  }

  public getConfirmExternalInterpreterFoundOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: ConfirmExternalInterpreterFoundQuery.select,
      where: { id },
      relations: ConfirmExternalInterpreterFoundQuery.relations,
    };
  }

  /**
   ** AppointmentCreateService
   */

  public getClientForCreateAppointmentOptions(id: string): FindOneOptions<UserRole> {
    return {
      select: {
        user: {
          id: true,
          platformId: true,
          phoneNumber: true,
        },
      },
      where: { id: id },
      relations: {
        profile: true,
        role: true,
        user: true,
      },
    };
  }

  /**
   ** AppointmentExternalSessionService
   */

  public checkInOutAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: CheckInOutAppointmentQuery.select,
      where: { id },
      relations: CheckInOutAppointmentQuery.relations,
    };
  }

  public checkInAlternativePlatformAppointmentOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: CheckInOutAlternativePlatformAppointmentUserRoleQuery.select,
      where: { id: userRoleId },
      relations: CheckInOutAlternativePlatformAppointmentUserRoleQuery.relations,
    };
  }

  /**
   ** AppointmentQueryService
   */

  public getAllAppointmentsForClientRolesOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    userRole: UserRole,
    dto?: GetAllAppointmentsDto,
    archived: boolean = false,
    appointmentsGroupId?: string,
  ): void {
    queryBuilder
      .select([
        "appointment.id",
        "appointment.platformId",
        "appointment.interpretingType",
        "appointment.interpreterType",
        "appointment.schedulingType",
        "appointment.communicationType",
        "appointment.interpretingType",
        "appointment.scheduledStartTime",
        "appointment.schedulingDurationMin",
        "appointment.languageFrom",
        "appointment.languageTo",
        "appointment.status",
        "appointment.archivedByClient",
        "appointment.appointmentsGroupId",
        "appointment.scheduledEndTime",
        "appointment.topic",
        "appointment.paidByClient",
        "appointment.clientCurrency",
        "appointment.isGroupAppointment",
        "appointment.creationDate",
      ])
      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect(["interpreter.id", "interpreter.operatedByCompanyId"])
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.preferredName", "interpreterProfile.gender"])
      .leftJoin("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.user", "interpreterUser")
      .addSelect(["interpreterUser.platformId", "interpreterUser.avatarUrl"])
      .andWhere("appointment.archivedByClient = :archived", { archived })
      .leftJoin("appointment.address", "address")
      .addSelect([
        "address.id",
        "address.latitude",
        "address.longitude",
        "address.country",
        "address.state",
        "address.suburb",
        "address.streetName",
        "address.streetNumber",
        "address.building",
        "address.unit",
        "address.postcode",
        "address.timezone",
      ]);

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES, userRole.role.name)) {
      queryBuilder
        .leftJoin("appointment.client", "client")
        .addSelect(["client.id", "client.operatedByCompanyId"])
        .andWhere("client.operatedByCompanyId = :operatedByCompanyId", {
          operatedByCompanyId: userRole.operatedByCompanyId,
        });
    } else {
      queryBuilder.andWhere("appointment.clientId = :clientId", { clientId: userRole.id });
    }

    if (appointmentsGroupId) {
      queryBuilder.andWhere("appointment.isGroupAppointment = :isGroupAppointment", { isGroupAppointment: true });
      queryBuilder.andWhere("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId });
    }

    if (dto) {
      this.applyFiltersForClientRoles(queryBuilder, dto, userRole);
      this.applyOrderingForClientRoles(queryBuilder, dto);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  public getAllAppointmentsForInterpreterRolesOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    userRole: UserRole,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): void {
    queryBuilder
      .select([
        "appointment.id",
        "appointment.platformId",
        "appointment.appointmentsGroupId",
        "appointment.scheduledStartTime",
        "appointment.schedulingDurationMin",
        "appointment.languageFrom",
        "appointment.languageTo",
        "appointment.status",
        "appointment.communicationType",
        "appointment.interpreterType",
        "appointment.archivedByClient",
        "appointment.archivedByInterpreter",
        "appointment.schedulingType",
        "appointment.scheduledEndTime",
        "appointment.topic",
        "appointment.sameInterpreter",
        "appointment.creationDate",
        "appointment.receivedByInterpreter",
        "appointment.interpreterCurrency",
        "appointment.isGroupAppointment",
      ])
      .leftJoin("appointment.client", "client")
      .addSelect(["client.id", "client.operatedByCompanyId"])
      .leftJoin("client.profile", "clientProfile")
      .addSelect([
        "clientProfile.firstName",
        "clientProfile.preferredName",
        "clientProfile.lastName",
        "clientProfile.gender",
      ])
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.platformId", "clientUser.avatarUrl"])
      .leftJoin("appointment.address", "address")
      .addSelect([
        "address.id",
        "address.latitude",
        "address.longitude",
        "address.country",
        "address.state",
        "address.suburb",
        "address.streetName",
        "address.streetNumber",
        "address.building",
        "address.unit",
        "address.postcode",
        "address.timezone",
      ])
      .andWhere("appointment.archivedByInterpreter = :archived", { archived });

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, userRole.role.name)) {
      queryBuilder
        .addSelect("appointment.interpretingType")
        .leftJoin("appointment.interpreter", "interpreter")
        .addSelect(["interpreter.id", "interpreter.operatedByCompanyId"])
        .leftJoin("appointment.appointmentRating", "appointmentRating")
        .addSelect(["appointmentRating.appointmentCallRating", "appointmentRating.interpreterRating"])
        .leftJoin("appointment.discountAssociation", "discountAssociation")
        .addSelect([
          "discountAssociation.membershipType",
          "discountAssociation.membershipDiscount",
          "discountAssociation.membershipFreeMinutes",
          "discountAssociation.promoCode",
          "discountAssociation.promoCampaignDiscount",
          "discountAssociation.promoCampaignDiscountMinutes",
        ])
        .andWhere(
          "(client.operatedByMainCorporateCompanyId = :operatedByCompanyId OR interpreter.operatedByCompanyId = :operatedByCompanyId)",
          { operatedByCompanyId: userRole.operatedByCompanyId },
        );
    } else {
      queryBuilder.andWhere("appointment.interpreterId = :interpreterId", { interpreterId: userRole.id });
    }

    if (appointmentsGroupId) {
      queryBuilder.andWhere("appointment.isGroupAppointment = :isGroupAppointment", { isGroupAppointment: true });
      queryBuilder.andWhere("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId });
    }

    if (dto) {
      this.applyFiltersForInterpreterRoles(queryBuilder, dto, userRole, archived);
      this.applyOrderingForInterpreterRoles(queryBuilder, dto, userRole);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  public getAllAppointmentsForAdminRolesOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    userRole: UserRole,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): void {
    queryBuilder
      .select([
        "appointment.id",
        "appointment.platformId",
        "appointment.appointmentsGroupId",
        "appointment.scheduledStartTime",
        "appointment.schedulingDurationMin",
        "appointment.languageFrom",
        "appointment.languageTo",
        "appointment.status",
        "appointment.communicationType",
        "appointment.interpretingType",
        "appointment.interpreterType",
        "appointment.archivedByClient",
        "appointment.schedulingType",
        "appointment.archivedByInterpreter",
        "appointment.scheduledEndTime",
        "appointment.topic",
        "appointment.creationDate",
        "appointment.paidByClient",
        "appointment.clientCurrency",
      ])
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.preferredName", "clientProfile.lastName"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.platformId"])

      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoin("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.preferredName"])
      .leftJoin("interpreter.user", "interpreterUser")
      .addSelect(["interpreterUser.platformId"])

      .leftJoin("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .addSelect([
        "appointmentAdminInfo.isRedFlagEnabled",
        "appointmentAdminInfo.interpreterFirstName",
        "appointmentAdminInfo.interpreterLastName",
        "appointmentAdminInfo.clientFirstName",
        "appointmentAdminInfo.clientLastName",
        "appointmentAdminInfo.isInterpreterFound",
      ])
      .leftJoin("appointment.discountAssociation", "discountAssociation")
      .addSelect([
        "discountAssociation.membershipType",
        "discountAssociation.membershipDiscount",
        "discountAssociation.membershipFreeMinutes",
        "discountAssociation.promoCode",
        "discountAssociation.promoCampaignDiscount",
        "discountAssociation.promoCampaignDiscountMinutes",
      ])
      .leftJoin("appointment.appointmentRating", "appointmentRating")
      .addSelect(["appointmentRating.appointmentCallRating", "appointmentRating.interpreterRating"]);

    if (isInRoles(CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES, userRole.role.name)) {
      queryBuilder.andWhere("client.operatedByCompanyId = :operatedByCompanyId ", {
        operatedByCompanyId: userRole.operatedByCompanyId,
      });
    }

    if (appointmentsGroupId) {
      queryBuilder.andWhere("appointment.isGroupAppointment = :isGroupAppointment", { isGroupAppointment: true });
      queryBuilder.andWhere("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId });
    }

    if (dto) {
      this.applyFiltersForAdminRoles(queryBuilder, dto, archived);
      this.applyOrderingForAdminRoles(queryBuilder, dto);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  private applyFiltersForClientRoles(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetAllAppointmentsDto,
    userRole: UserRole,
  ): void {
    if (dto.searchField) {
      this.applySearchForClientRoles(queryBuilder, dto.searchField);
    }

    if (dto.interpreterOperatedByCompanyId) {
      queryBuilder.andWhere("interpreter.operatedByCompanyId = :interpreterOperatedByCompanyId", {
        interpreterOperatedByCompanyId: dto.interpreterOperatedByCompanyId,
      });
    }

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES, userRole.role.name)) {
      if (dto.clientId) {
        queryBuilder.andWhere("appointment.clientId = :clientId", {
          clientId: dto.clientId,
        });
      }
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyFiltersForInterpreterRoles(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetAllAppointmentsDto,
    userRole: UserRole,
    archived: boolean,
  ): void {
    if (dto.searchField) {
      this.applySearchForInterpreterRoles(queryBuilder, dto.searchField);
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, userRole.role.name)) {
      if (archived) {
        if (dto.clientId) {
          queryBuilder.andWhere("appointment.archivedByClient = :archived", { archived });
        }

        if (dto.interpreterId) {
          queryBuilder.andWhere("appointment.archivedByInterpreter = :archived", { archived });
        }
      }

      if (dto.clientId) {
        queryBuilder.andWhere("appointment.clientId = :clientId", {
          clientId: dto.clientId,
        });
      }

      if (dto.interpreterId) {
        queryBuilder.andWhere("appointment.interpreterId = :interpreterId", {
          interpreterId: dto.interpreterId,
        });
      }
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyFiltersForAdminRoles(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetAllAppointmentsDto,
    archived: boolean,
  ): void {
    if (archived) {
      if (dto.clientId) {
        queryBuilder.andWhere("appointment.archivedByClient = :archived", { archived });
      }

      if (dto.interpreterId) {
        queryBuilder.andWhere("appointment.archivedByInterpreter = :archived", { archived });
      }
    }

    if (dto.searchField) {
      this.applySearchForAdminRoles(queryBuilder, dto.searchField);
    }

    if (dto.isRedFlagOnly) {
      queryBuilder.andWhere("appointmentAdminInfo.isRedFlagEnabled = :isRedFlagOnly", { isRedFlagOnly: true });
    }

    if (dto.clientId) {
      queryBuilder.andWhere("appointment.clientId = :clientId", {
        clientId: dto.clientId,
      });
    }

    if (dto.interpreterId) {
      queryBuilder.andWhere("appointment.interpreterId = :interpreterId", {
        interpreterId: dto.interpreterId,
      });
    }

    if (dto.operatedByCompanyId) {
      queryBuilder.andWhere("appointment.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: dto.operatedByCompanyId,
      });
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    if (dto.interpreterOperatedByCompanyId) {
      queryBuilder.andWhere("interpreter.operatedByCompanyId = :interpreterOperatedByCompanyId", {
        interpreterOperatedByCompanyId: dto.interpreterOperatedByCompanyId,
      });
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyBaseFilters(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    if (dto.statuses?.length) {
      queryBuilder.andWhere("appointment.status IN (:...statuses)", {
        statuses: dto.statuses,
      });
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("appointment.schedulingType IN (:...schedulingTypes)", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("appointment.interpretingType IN (:...interpretingTypes)", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("appointment.topic IN (:...topics)", {
        topics: dto.topics,
      });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("appointment.communicationType IN (:...communicationTypes)", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("appointment.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("appointment.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.schedulingDurationMin) {
      queryBuilder.andWhere("appointment.schedulingDurationMin = :schedulingDurationMin", {
        schedulingDurationMin: dto.schedulingDurationMin,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("DATE(appointment.scheduledStartTime) BETWEEN :startDate::date AND :endDate::date", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }
  }

  private applySearchForClientRoles(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.andWhere("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("interpreterUser.platformId ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("interpreterProfile"."preferred_name", "interpreterProfile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("interpreterProfile.lastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applySearchForInterpreterRoles(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.andWhere("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("clientUser.platformId ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("clientProfile"."preferred_name", "clientProfile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("clientProfile.lastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applySearchForAdminRoles(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.andWhere("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("clientUser.platformId ILIKE :search", { search: searchTerm })
          .orWhere("interpreterUser.platformId ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("clientProfile"."preferred_name", "clientProfile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("clientProfile.lastName ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("interpreterProfile"."preferred_name", "interpreterProfile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("interpreterProfile.lastName ILIKE :search", { search: searchTerm })
          .orWhere("discountAssociation.promoCode ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrderingForClientRoles(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    this.applyBaseOrdering(queryBuilder, dto);

    if (dto.interpreterFirstNameOrder) {
      queryBuilder
        .addSelect(
          `COALESCE("interpreterProfile"."preferred_name", "interpreterProfile"."first_name")`,
          "interpreter_name_sort",
        )
        .addOrderBy("interpreter_name_sort", dto.interpreterFirstNameOrder);
    }
  }

  private applyOrderingForInterpreterRoles(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetAllAppointmentsDto,
    userRole: UserRole,
  ): void {
    this.applyBaseOrdering(queryBuilder, dto);

    if (dto.clientFirstNameOrder) {
      queryBuilder
        .addSelect(`COALESCE("clientProfile"."preferred_name", "clientProfile"."first_name")`, "client_name_sort")
        .addOrderBy("client_name_sort", dto.clientFirstNameOrder);
    }

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, userRole.role.name)) {
      if (dto.membershipTypeOrder) {
        const caseStatement = generateCaseForEnumOrder("discountAssociation.membershipType", membershipTypeOrder);
        queryBuilder.addSelect(caseStatement, "membership_type_order");
        queryBuilder.addOrderBy("membership_type_order", dto.membershipTypeOrder);
      }

      if (dto.membershipDiscountOrder) {
        queryBuilder.addOrderBy("discountAssociation.membershipDiscount", dto.membershipDiscountOrder);
      }

      if (dto.membershipFreeMinutesOrder) {
        queryBuilder.addOrderBy("discountAssociation.membershipFreeMinutes", dto.membershipFreeMinutesOrder);
      }

      if (dto.promoCodeOrder) {
        queryBuilder.addOrderBy("discountAssociation.promoCode", dto.membershipFreeMinutesOrder);
      }

      if (dto.promoCampaignDiscountOrder) {
        queryBuilder.addOrderBy("discountAssociation.promoCampaignDiscount", dto.promoCampaignDiscountOrder);
      }

      if (dto.promoCampaignDiscountMinutesOrder) {
        queryBuilder.addOrderBy(
          "discountAssociation.promoCampaignDiscountMinutes",
          dto.promoCampaignDiscountMinutesOrder,
        );
      }
    }
  }

  private applyOrderingForAdminRoles(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    queryBuilder.addOrderBy("appointmentAdminInfo.isRedFlagEnabled", ESortOrder.DESC);

    this.applyBaseOrdering(queryBuilder, dto);

    if (dto.clientFirstNameOrder) {
      queryBuilder
        .addSelect(`COALESCE("clientProfile"."preferred_name", "clientProfile"."first_name")`, "client_name_sort")
        .addOrderBy("client_name_sort", dto.clientFirstNameOrder);
    }

    if (dto.interpreterFirstNameOrder) {
      queryBuilder
        .addSelect(
          `COALESCE("interpreterProfile"."preferred_name", "interpreterProfile"."first_name")`,
          "interpreter_name_sort",
        )
        .addOrderBy("interpreter_name_sort", dto.interpreterFirstNameOrder);
    }

    if (dto.membershipTypeOrder) {
      const caseStatement = generateCaseForEnumOrder("discountAssociation.membershipType", membershipTypeOrder);
      queryBuilder.addSelect(caseStatement, "membership_type_order");
      queryBuilder.addOrderBy("membership_type_order", dto.membershipTypeOrder);
    }

    if (dto.membershipDiscountOrder) {
      queryBuilder.addOrderBy("discountAssociation.membershipDiscount", dto.membershipDiscountOrder);
    }

    if (dto.membershipFreeMinutesOrder) {
      queryBuilder.addOrderBy("discountAssociation.membershipFreeMinutes", dto.membershipFreeMinutesOrder);
    }

    if (dto.promoCodeOrder) {
      queryBuilder.addOrderBy("discountAssociation.promoCode", dto.membershipFreeMinutesOrder);
    }

    if (dto.promoCampaignDiscountOrder) {
      queryBuilder.addOrderBy("discountAssociation.promoCampaignDiscount", dto.promoCampaignDiscountOrder);
    }

    if (dto.promoCampaignDiscountMinutesOrder) {
      queryBuilder.addOrderBy(
        "discountAssociation.promoCampaignDiscountMinutes",
        dto.promoCampaignDiscountMinutesOrder,
      );
    }
  }

  private applyBaseOrdering(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    if (dto.sortOrder) {
      queryBuilder.addOrderBy("appointment.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("appointment.platformId", dto.platformIdOrder);
    }

    if (dto.statusOrder) {
      const caseStatement = generateCaseForEnumOrder("appointment.status", appointmentStatusOrder);
      queryBuilder.addSelect(caseStatement, "status_order");
      queryBuilder.addOrderBy("status_order", dto.statusOrder);
    }

    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "appointment.scheduling_type",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "appointment.communication_type",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "appointment.interpreting_type",
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
      const caseStatement = generateCaseForEnumOrder("appointment.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("appointment.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("appointment.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("appointment.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }
  }

  public getAppointmentForClientOrInterpreterOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    id: string,
    user: ITokenUserData,
  ): void {
    queryBuilder
      .leftJoinAndSelect("appointment.participants", "participants")
      .leftJoinAndSelect("appointment.address", "address")

      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoinAndSelect("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect([
        "clientProfile.firstName",
        "clientProfile.preferredName",
        "clientProfile.lastName",
        "clientProfile.gender",
      ])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.id", "clientUser.platformId", "clientUser.avatarUrl"])

      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoinAndSelect("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.preferredName", "interpreterProfile.gender"])
      .leftJoin("interpreter.user", "interpreterUser")
      .addSelect(["interpreterUser.id", "interpreterUser.platformId", "interpreterUser.avatarUrl"])

      .leftJoin("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .addSelect(["appointmentAdminInfo.id", "appointmentAdminInfo.isInterpreterFound"])
      .leftJoin(
        "appointmentAdminInfo.cancellations",
        "cancellation",
        "cancellation.roleName NOT IN (:...interpreterRoles)",
        { interpreterRoles: INTERPRETER_ROLES },
      )
      .addSelect([
        "cancellation.id",
        "cancellation.cancelledById",
        "cancellation.cancelledByPlatformId",
        "cancellation.cancelledByFirstName",
        "cancellation.cancelledByPreferredName",
        "cancellation.cancellationReason",
        "cancellation.roleName",
        "cancellation.creationDate",
      ])
      .leftJoin("appointment.appointmentRating", "appointmentRating")
      .addSelect([
        "appointmentRating.appointmentCallRating",
        "appointmentRating.appointmentCallRatingFeedback",
        "appointmentRating.interpreterRatedCallQuality",
        "appointmentRating.interpreterRating",
        "appointmentRating.interpreterRatingFeedback",
        "appointmentRating.clientRatedInterpreter",
      ])

      .leftJoin("appointment.blacklists", "blacklists", "blacklists.blockedByUserRoleId = :userRoleId", {
        userRoleId: user.userRoleId,
      })
      .addSelect([
        "blacklists.id",
        "blacklists.blockedByUserRoleId",
        "blacklists.blockedUserRoleId",
        "blacklists.creationDate",
      ])

      .leftJoin("appointment.appointmentExternalSession", "appointmentExternalSession")
      .addSelect([
        "appointmentExternalSession.id",
        "appointmentExternalSession.firstVerifyingPersonName",
        "appointmentExternalSession.firstVerifyingPersonSignature",
        "appointmentExternalSession.secondVerifyingPersonName",
        "appointmentExternalSession.secondVerifyingPersonSignature",
        "appointmentExternalSession.alternativeStartTime",
        "appointmentExternalSession.alternativeEndTime",
      ])

      .andWhere("appointment.id = :id", { id })
      .andWhere("(appointment.clientId = :userRoleId OR appointment.interpreterId = :userRoleId)", {
        userRoleId: user.userRoleId,
      });
  }

  public getAppointmentForAdminOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        interpreter: {
          id: true,
          role: {
            name: true,
          },
          profile: {
            firstName: true,
            preferredName: true,
            gender: true,
          },
          user: {
            id: true,
            platformId: true,
            avatarUrl: true,
          },
        },
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
            id: true,
            platformId: true,
            avatarUrl: true,
          },
        },
        appointmentOrder: {
          id: true,
          endSearchTime: true,
          appointmentOrderGroup: {
            id: true,
            endSearchTime: true,
          },
        },
        appointmentExternalSession: {
          id: true,
          firstVerifyingPersonName: true,
          firstVerifyingPersonSignature: true,
          secondVerifyingPersonName: true,
          secondVerifyingPersonSignature: true,
          alternativeStartTime: true,
          alternativeEndTime: true,
        },
        discountAssociation: {
          promoCampaignDiscount: true,
          membershipDiscount: true,
          promoCampaignDiscountMinutes: true,
          membershipFreeMinutes: true,
          promoCode: true,
          membershipType: true,
        },
      },
      where: { id },
      relations: {
        appointmentAdminInfo: {
          cancellations: true,
        },
        participants: true,
        address: true,
        client: {
          profile: true,
          user: true,
          role: true,
        },
        interpreter: {
          profile: true,
          user: true,
          role: true,
        },
        appointmentRating: true,
        appointmentOrder: {
          appointmentOrderGroup: true,
        },
        blacklists: true,
        appointmentExternalSession: true,
        discountAssociation: true,
      },
    };
  }

  public getAppointmentsGroupIdsOptions(queryBuilder: SelectQueryBuilder<Appointment>, user: ITokenUserData): void {
    queryBuilder
      .select("DISTINCT appointment.appointmentsGroupId", "appointmentsGroupId")
      .andWhere("appointment.appointmentsGroupId IS NOT NULL");

    if (user.role !== EUserRoleName.SUPER_ADMIN) {
      queryBuilder
        .leftJoin("appointment.client", "client")
        .leftJoin("appointment.interpreter", "interpreter")
        .andWhere("(client.user_id = :userId OR interpreter.user_id = :userId)", { userId: user.id });
    }
  }

  private applyAppointmentSelectForWebSocket(): FindOptionsSelect<Appointment> {
    return {
      id: true,
      platformId: true,
      paidByClient: true,
      clientCurrency: true,
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
        },
      },
      interpreter: {
        id: true,
        role: {
          name: true,
        },
        profile: {
          firstName: true,
          preferredName: true,
          gender: true,
        },
        user: {
          platformId: true,
        },
      },
      appointmentAdminInfo: {
        isRedFlagEnabled: true,
      },
      appointmentRating: {
        appointmentCallRating: true,
        interpreterRating: true,
      },
      discountAssociation: {
        promoCampaignDiscount: true,
        membershipDiscount: true,
        promoCampaignDiscountMinutes: true,
        promoCode: true,
        membershipFreeMinutes: true,
        membershipType: true,
      },
      status: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      schedulingDurationMin: true,
      communicationType: true,
      schedulingType: true,
      topic: true,
      interpreterType: true,
      languageFrom: true,
      languageTo: true,
      isGroupAppointment: true,
      appointmentsGroupId: true,
      creationDate: true,
    };
  }

  private applyAppointmentRelationsForWebSocket(): FindOptionsRelations<Appointment> {
    return {
      client: {
        profile: true,
        user: true,
        role: true,
      },
      interpreter: {
        profile: true,
        user: true,
        role: true,
      },
      appointmentAdminInfo: true,
      appointmentRating: true,
      discountAssociation: true,
    };
  }

  public getNewAppointmentsForWebSocketOptions(lastChecked: Date): FindManyOptions<Appointment> {
    return {
      select: this.applyAppointmentSelectForWebSocket(),
      where: { isGroupAppointment: false, creationDate: MoreThan(lastChecked) },
      order: { creationDate: ESortOrder.ASC },
      relations: this.applyAppointmentRelationsForWebSocket(),
    };
  }

  public getNewAppointmentGroupsForWebSocketOptions(lastChecked: Date): FindManyOptions<Appointment> {
    return {
      select: this.applyAppointmentSelectForWebSocket(),
      where: { isGroupAppointment: true, creationDate: MoreThan(lastChecked) },
      relations: this.applyAppointmentRelationsForWebSocket(),
    };
  }

  public getNewRedFlagAppointmentsForWebSocketOptions(lastChecked: Date): FindManyOptions<Appointment> {
    return {
      select: this.applyAppointmentSelectForWebSocket(),
      where: {
        isGroupAppointment: false,
        appointmentAdminInfo: { isRedFlagEnabled: true, updatingDate: MoreThan(lastChecked) },
      },
      order: { creationDate: ESortOrder.ASC },
      relations: this.applyAppointmentRelationsForWebSocket(),
    };
  }

  public getNewRedFlagAppointmentGroupsForWebSocketOptions(lastChecked: Date): FindManyOptions<Appointment> {
    return {
      select: this.applyAppointmentSelectForWebSocket(),
      where: {
        isGroupAppointment: true,
        appointmentAdminInfo: { isRedFlagEnabled: true, updatingDate: MoreThan(lastChecked) },
      },
      relations: this.applyAppointmentRelationsForWebSocket(),
    };
  }

  public getAppointmentGroupRedFlagForWebSocketOptions(appointmentsGroupId: string): FindManyOptions<Appointment> {
    return {
      select: this.applyAppointmentSelectForWebSocket(),
      where: { isGroupAppointment: true, appointmentsGroupId: appointmentsGroupId },
      order: { scheduledStartTime: ESortOrder.ASC },
      relations: this.applyAppointmentRelationsForWebSocket(),
    };
  }

  public getFirstScheduledAppointmentOptions(groupPlatformId: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        communicationType: true,
        scheduledStartTime: true,
      },
      where: { isGroupAppointment: true, appointmentsGroupId: groupPlatformId },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  public getUsersPendingOnDemandAppointmentsOptions(
    userRoleIds: string[],
    statusesToBroadcast: EAppointmentStatus[],
    thresholdTime: Date,
  ): FindManyOptions<Appointment> {
    return {
      select: { id: true, clientId: true, status: true },
      where: {
        clientId: In(userRoleIds),
        status: In(statusesToBroadcast),
        schedulingType: EAppointmentSchedulingType.ON_DEMAND,
        creationDate: MoreThanOrEqual(thresholdTime),
      },
      order: { creationDate: ESortOrder.DESC },
    };
  }

  /**
   ** AppointmentRatingService
   */

  public getAndValidateAppointmentRatingOptions(id: string): FindOneOptions<AppointmentRating> {
    return {
      select: {
        appointment: {
          id: true,
          status: true,
          interpreter: {
            id: true,
            interpreterProfile: {
              id: true,
              interpreterBadgePdf: true,
            },
          },
        },
      },
      where: { appointment: { id } },
      relations: { appointment: { interpreter: { interpreterProfile: true } } },
    };
  }

  public getToggleInterpreterRatingExclusionOptions(id: string): FindOneOptions<AppointmentRating> {
    return {
      select: {
        id: true,
        excludeInterpreterRating: true,
        interpreterId: true,
        appointment: {
          interpreterId: true,
          interpreter: {
            id: true,
            interpreterProfile: {
              id: true,
              interpreterBadgePdf: true,
            },
          },
        },
      },
      where: { appointment: { id } },
      relations: { appointment: { interpreter: { interpreterProfile: true } } },
    };
  }

  public getInterpreterRatingsOptions(interpreterId: string): FindManyOptions<AppointmentRating> {
    return {
      select: {
        interpreterRating: true,
      },
      where: {
        interpreterId,
        excludeInterpreterRating: false,
      },
    };
  }

  public getCreateAppointmentRatingOptions(appointmentId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        interpreterId: true,
        clientId: true,
        interpreter: {
          id: true,
          interpreterProfile: {
            id: true,
            interpreterBadgePdf: true,
          },
        },
      },
      where: { id: appointmentId },
      relations: { interpreter: { interpreterProfile: true } },
    };
  }

  /**
   ** AppointmentSchedulerService
   */

  public getActivateUpcomingAppointmentsOptions(
    currentTime: Date,
    activationThresholdEnd: Date,
  ): FindOptionsWhere<Appointment> {
    return {
      status: EAppointmentStatus.ACCEPTED,
      scheduledStartTime: Between(currentTime, activationThresholdEnd),
    };
  }

  public getCloseInactiveOrPaymentFailedLiveAppointmentsOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    thresholdTime: Date,
  ): void {
    queryBuilder
      .select(["appointment.id", "appointment.clientLastActiveTime"])
      .leftJoin("appointment.chimeMeetingConfiguration", "chimeMeetingConfiguration")
      .addSelect(["chimeMeetingConfiguration.id", "chimeMeetingConfiguration.chimeMeetingId"])
      .andWhere("appointment.communicationType != :communicationType", {
        communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
      })
      .andWhere("appointment.status = :status", { status: EAppointmentStatus.LIVE })
      .andWhere("appointment.alternativePlatform = :alternativePlatform", { alternativePlatform: false })
      .andWhere(
        `(
          appointment.clientLastActiveTime < :thresholdTime
          OR (
            (appointment.businessEndTime IS NOT NULL AND appointment.businessEndTime < :currentTime)
            OR (appointment.businessEndTime IS NULL AND appointment.internalEstimatedEndTime < :currentTime)
          )
        )`,
        { thresholdTime, currentTime: new Date() },
      );
  }

  public getCloseExpiredAppointmentsWithoutClientVisitOptions(currentTime: Date): FindManyOptions<Appointment> {
    return {
      select: AppointmentsWithoutClientVisitQuery.select,
      where: {
        status: EAppointmentStatus.LIVE,
        communicationType: Not(EAppointmentCommunicationType.FACE_TO_FACE),
        alternativePlatform: false,
        clientLastActiveTime: IsNull(),
        scheduledEndTime: LessThan(currentTime),
      },
      relations: AppointmentsWithoutClientVisitQuery.relations,
    };
  }

  public getProcessExpiredAppointmentsWithoutCheckInOptions(currentTime: Date): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        status: true,
        scheduledStartTime: true,
        creationDate: true,
        communicationType: true,
        clientId: true,
        appointmentReminder: {
          id: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
        client: {
          id: true,
          user: {
            id: true,
            email: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
        interpreter: {
          id: true,
          user: {
            id: true,
            email: true,
          },
          role: {
            id: true,
            name: true,
          },
        },
      },
      where: [
        {
          communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
          status: EAppointmentStatus.LIVE,
          scheduledEndTime: LessThanOrEqual(currentTime),
          appointmentExternalSession: { id: IsNull() },
        },
        {
          communicationType: In(AUDIO_VIDEO_COMMUNICATION_TYPES),
          alternativePlatform: true,
          status: EAppointmentStatus.LIVE,
          scheduledEndTime: LessThanOrEqual(currentTime),
          appointmentExternalSession: { id: IsNull() },
        },
      ],
      relations: {
        appointmentReminder: true,
        appointmentAdminInfo: true,
        client: { user: true, role: true },
        interpreter: { user: true, role: true },
      },
    };
  }

  public getInterpreterHasLateAppointmentsOptions(lateThreshold: Date): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        interpreterId: true,
      },
      where: [
        {
          status: EAppointmentStatus.LIVE,
          schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          communicationType: In(AUDIO_VIDEO_COMMUNICATION_TYPES),
          scheduledStartTime: LessThanOrEqual(lateThreshold),
          chimeMeetingConfiguration: { isInterpreterWasOnlineInBooking: IsNull() },
        },
        {
          status: EAppointmentStatus.LIVE,
          schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          communicationType: In(AUDIO_VIDEO_COMMUNICATION_TYPES),
          alternativePlatform: true,
          scheduledStartTime: LessThanOrEqual(lateThreshold),
          appointmentExternalSession: { id: IsNull() },
        },
      ],
    };
  }

  /**
   ** AppointmentUpdateService
   */

  public getUpdateAppointmentOptions(id: string, user?: ITokenUserData): FindOneOptions<Appointment> {
    const isClient = user && isInRoles(CLIENT_ROLES, user.role);

    return {
      select: {
        id: true,
        status: true,
        scheduledStartTime: true,
        communicationType: true,
        schedulingDurationMin: true,
        participantType: true,
        topic: true,
        preferredInterpreterGender: true,
        languageFrom: true,
        languageTo: true,
        isGroupAppointment: true,
        sameInterpreter: true,
        appointmentsGroupId: true,
        platformId: true,
        alternativeVideoConferencingPlatformLink: true,
        acceptOvertimeRates: true,
        alternativePlatform: true,
        chimeMeetingConfiguration: {
          id: true,
          maxAttendees: true,
        },
        interpreter: {
          id: true,
          user: {
            id: true,
            email: true,
          },
          profile: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      where: isClient ? { id, clientId: user?.userRoleId } : { id },
      relations: { chimeMeetingConfiguration: true, interpreter: { user: true, profile: true } },
    };
  }

  public getAppointmentWithParticipantsAndClientOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        communicationType: true,
        scheduledStartTime: true,
        languageFrom: true,
        languageTo: true,
        topic: true,
        schedulingDurationMin: true,
        alternativeVideoConferencingPlatformLink: true,
        participants: {
          id: true,
          email: true,
          phoneCode: true,
          phoneNumber: true,
        },
        client: {
          id: true,
          role: {
            id: true,
            name: true,
          },
          profile: {
            id: true,
            firstName: true,
            preferredName: true,
            lastName: true,
          },
        },
        interpreter: {
          id: true,
          role: {
            id: true,
            name: true,
          },
        },
        chimeMeetingConfiguration: {
          id: true,
        },
      },
      where: { id },
      relations: {
        participants: true,
        client: { role: true, profile: true },
        interpreter: { role: true },
        chimeMeetingConfiguration: true,
      },
    };
  }

  public getUpdateAppointmentSearchConditionsOptions(id: string, userRoleId: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        topic: true,
        preferredInterpreterGender: true,
        isGroupAppointment: true,
        appointmentsGroupId: true,
        appointmentOrder: {
          id: true,
          appointmentOrderGroup: {
            id: true,
          },
        },
      },
      where: { id: id, clientId: userRoleId },
      relations: {
        appointmentOrder: {
          appointmentOrderGroup: true,
        },
      },
    };
  }

  /**
   ** AppointmentRecreateService
   */

  public getRecreateAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        scheduledStartTime: true,
        schedulingDurationMin: true,
        communicationType: true,
        schedulingType: true,
        topic: true,
        preferredInterpreterGender: true,
        interpreterType: true,
        interpretingType: true,
        simultaneousInterpretingType: true,
        languageFrom: true,
        languageTo: true,
        participantType: true,
        alternativePlatform: true,
        alternativeVideoConferencingPlatformLink: true,
        notes: true,
        schedulingExtraDay: true,
        isGroupAppointment: true,
        appointmentsGroupId: true,
        sameInterpreter: true,
        acceptOvertimeRates: true,
        interpreterId: true,
        client: {
          id: true,
          timezone: true,
          operatedByCompanyName: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyName: true,
          operatedByMainCorporateCompanyId: true,
          role: {
            id: true,
            name: true,
          },
          profile: {
            id: true,
            firstName: true,
            lastName: true,
            contactEmail: true,
            dateOfBirth: true,
          },
          user: {
            id: true,
            platformId: true,
            phoneNumber: true,
          },
        },
        participants: {
          id: true,
          name: true,
          age: true,
          phoneCode: true,
          phoneNumber: true,
          email: true,
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
        appointmentReminder: {
          id: true,
        },
        chimeMeetingConfiguration: {
          id: true,
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
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
      },
      where: { id: id },
      relations: {
        client: { role: true, profile: true, user: true },
        participants: true,
        address: true,
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
        appointmentAdminInfo: true,
      },
    };
  }

  public getGroupRecreationOptions(groupId: string, recreatedAppointmentId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        scheduledStartTime: true,
        schedulingDurationMin: true,
        communicationType: true,
        schedulingType: true,
        topic: true,
        preferredInterpreterGender: true,
        interpreterType: true,
        interpretingType: true,
        simultaneousInterpretingType: true,
        languageFrom: true,
        languageTo: true,
        participantType: true,
        alternativePlatform: true,
        alternativeVideoConferencingPlatformLink: true,
        notes: true,
        schedulingExtraDay: true,
        isGroupAppointment: true,
        appointmentsGroupId: true,
        sameInterpreter: true,
        acceptOvertimeRates: true,
        interpreterId: true,
        client: {
          id: true,
          timezone: true,
          operatedByCompanyName: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyName: true,
          operatedByMainCorporateCompanyId: true,
          role: {
            id: true,
            name: true,
          },
          profile: {
            id: true,
            firstName: true,
            lastName: true,
            contactEmail: true,
            dateOfBirth: true,
          },
          user: {
            id: true,
            platformId: true,
            phoneNumber: true,
          },
        },
        participants: {
          id: true,
          name: true,
          age: true,
          phoneCode: true,
          phoneNumber: true,
          email: true,
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
        appointmentReminder: {
          id: true,
        },
        chimeMeetingConfiguration: {
          id: true,
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
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
      },
      where: {
        id: Not(recreatedAppointmentId),
        appointmentsGroupId: groupId,
        status: In([EAppointmentStatus.PENDING, EAppointmentStatus.ACCEPTED]),
      },
      relations: {
        client: { role: true, profile: true, user: true },
        participants: true,
        address: true,
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
        appointmentAdminInfo: true,
      },
    };
  }
}
