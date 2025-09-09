import { Injectable } from "@nestjs/common";
import { Brackets, FindManyOptions, SelectQueryBuilder } from "typeorm";
import { LFH_ADMIN_ROLES } from "src/common/constants";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UserRole } from "src/modules/users/entities";
import {
  GetCsvAppointmentsDto,
  GetCsvCompaniesDto,
  GetCsvDraftAppointmentsDto,
  GetCsvEmployeesDto,
  GetCsvUsersDto,
} from "src/modules/csv/common/dto";
import { ESortOrder } from "src/common/enums";
import { generateCaseForEnumOrder, isInRoles } from "src/common/utils";
import {
  appointmentStatusOrder,
  appointmentSchedulingTypeOrder,
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentTopicOrder,
} from "src/modules/appointments/appointment/common/enums";
import {
  interpreterCertificateTypeOrder,
  languageLevelOrder,
  languageOrder,
} from "src/modules/interpreters/profile/common/enum";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { User } from "src/modules/users/entities";
import { accountStatusOrder, EUserRoleName, userGenderOrder } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";
import { countryOrder } from "src/modules/addresses/common/enums";
import {
  companyStatusOrder,
  companyActivitySphereOrder,
  companyEmployeesNumberOrder,
} from "src/modules/companies/common/enums";

@Injectable()
export class CsvQueryOptionsService {
  /**
   ** getAppointmentsCsvData
   */

  public getCsvAppointmentsForClientOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    user: ITokenUserData,
    archived: boolean = false,
    dto: GetCsvAppointmentsDto,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoin("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.preferredName", "interpreterProfile.gender"])
      .where("appointment.clientId = :clientId", { clientId: user.userRoleId })
      .andWhere("appointment.archivedByClient = :archived", { archived });

    this.applyAppointmentFiltersForClient(queryBuilder, dto);
    this.applyAppointmentOrdering(queryBuilder, dto);

    queryBuilder.skip(offset).take(limit);
  }

  public getCsvAppointmentsForInterpreterOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    user: ITokenUserData,
    archived: boolean = false,
    dto: GetCsvAppointmentsDto,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect([
        "clientProfile.firstName",
        "clientProfile.preferredName",
        "clientProfile.lastName",
        "clientProfile.gender",
      ])
      .where("appointment.interpreterId = :interpreterId", { interpreterId: user.userRoleId })
      .andWhere("appointment.archivedByInterpreter = :archived", { archived });

    this.applyAppointmentFiltersForInterpreter(queryBuilder, dto);
    this.applyAppointmentOrdering(queryBuilder, dto);

    queryBuilder.skip(offset).take(limit);
  }

  public getCsvAppointmentsForAdminOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetCsvAppointmentsDto,
    adminUserRole: UserRole,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect([
        "clientProfile.firstName",
        "clientProfile.preferredName",
        "clientProfile.lastName",
        "clientProfile.gender",
      ])

      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoin("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.preferredName", "interpreterProfile.gender"])

      .leftJoin("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .addSelect(["appointmentAdminInfo.isRedFlagEnabled", "appointmentAdminInfo.notes"])
      .leftJoin("appointment.discountAssociation", "discountAssociation")
      .addSelect([
        "discountAssociation.promoCampaignDiscount",
        "discountAssociation.membershipDiscount",
        "discountAssociation.promoCampaignDiscountMinutes",
        "discountAssociation.membershipFreeMinutes",
        "discountAssociation.promoCode",
        "discountAssociation.membershipType",
      ])
      .leftJoin("appointment.appointmentRating", "appointmentRating")
      .addSelect(["appointmentRating.appointmentCallRating", "appointmentRating.interpreterRating"]);

    if (!isInRoles(LFH_ADMIN_ROLES, adminUserRole.role.name)) {
      queryBuilder.where(
        "client.operatedByCompanyId = :operatedByCompanyId OR interpreter.operatedByCompanyId = :operatedByCompanyId OR appointment.operatedByCompanyId = :operatedByCompanyId",
        { operatedByCompanyId: adminUserRole.operatedByCompanyId },
      );
    }

    this.applyAppointmentFiltersForAdmin(queryBuilder, dto);
    this.applyAppointmentOrdering(queryBuilder, dto, true);

    queryBuilder.skip(offset).take(limit);
  }

  private applyAppointmentFiltersForClient(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetCsvAppointmentsDto,
  ): void {
    if (dto.searchField) {
      this.applySearchForClient(queryBuilder, dto.searchField);
    }

    if (dto.interpreterOperatedByCompanyId) {
      queryBuilder.andWhere("interpreter.operatedByCompanyId = :interpreterOperatedByCompanyId", {
        interpreterOperatedByCompanyId: dto.interpreterOperatedByCompanyId,
      });
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyAppointmentFiltersForInterpreter(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetCsvAppointmentsDto,
  ): void {
    if (dto.searchField) {
      this.applySearchForInterpreter(queryBuilder, dto.searchField);
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyAppointmentFiltersForAdmin(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetCsvAppointmentsDto,
  ): void {
    if (dto.searchField) {
      this.applySearchForAdmin(queryBuilder, dto.searchField);
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

  public applyBaseFilters(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetCsvAppointmentsDto): void {
    if (dto.searchField) {
      this.applySearchForInterpreter(queryBuilder, dto.searchField);
    }

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

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
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

    queryBuilder.andWhere("appointment.scheduled_start_time::date BETWEEN :startDate::date AND :endDate::date", {
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
  }

  private applySearchForClient(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.streetName ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
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

  private applySearchForInterpreter(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.streetName ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
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

  private applySearchForAdmin(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.streetName ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
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
          .orWhere("interpreterProfile.lastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyAppointmentOrdering(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetCsvAppointmentsDto,
    forAdmin: boolean = false,
  ): void {
    if (forAdmin) {
      queryBuilder.addOrderBy("appointmentAdminInfo.isRedFlagEnabled", ESortOrder.DESC);
    }

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

    if (dto.operatedByCompanyNameOrder) {
      queryBuilder.addOrderBy("appointment.operatedByCompanyName", dto.operatedByCompanyNameOrder);
    }

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
  }

  /**
   ** getDraftAppointmentsCsvData
   */

  public getCsvDraftAppointmentsForClientOptions(
    userRoleId: string,
    offset: number,
    limit: number,
  ): FindManyOptions<DraftAppointment> {
    return {
      where: {
        clientId: userRoleId,
      },
      relations: {
        draftParticipants: true,
        draftAddress: true,
        draftExtraDays: {
          draftAddress: true,
        },
      },
      skip: offset,
      take: limit,
    };
  }

  public getCsvDraftAppointmentsForAdminOptions(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto: GetCsvDraftAppointmentsDto,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .leftJoin("draftAppointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
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
      .leftJoinAndSelect("draftAppointment.draftAddress", "draftAddress")
      .leftJoinAndSelect("draftAppointment.draftExtraDays", "draftExtraDays");

    this.applyDraftAppointmentFiltersForAdmin(queryBuilder, dto);
    this.applyDraftAppointmentOrdering(queryBuilder, dto);
    queryBuilder.skip(offset).take(limit);
  }

  private applyDraftAppointmentFiltersForAdmin(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto: GetCsvDraftAppointmentsDto,
  ): void {
    if (dto.searchField) {
      this.applyDraftAppointmentSearchForAdmin(queryBuilder, dto.searchField);
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("draftAppointment.schedulingType IN (:...schedulingTypes)", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("draftAppointment.interpretingType IN (:...interpretingTypes)", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("draftAppointment.topic IN (:...topics)", {
        topics: dto.topics,
      });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("draftAppointment.communicationType IN (:...communicationTypes)", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("draftAppointment.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("draftAppointment.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.schedulingDurationMin) {
      queryBuilder.andWhere("draftAppointment.schedulingDurationMin = :schedulingDurationMin", {
        schedulingDurationMin: dto.schedulingDurationMin,
      });
    }

    if (dto.operatedByCompanyId) {
      queryBuilder.andWhere("draftAppointment.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: dto.operatedByCompanyId,
      });
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("DATE(draftAppointment.scheduledStartTime) BETWEEN :startDate::date AND :endDate::date", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }
  }

  private applyDraftAppointmentSearchForAdmin(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    searchField: string,
  ): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("draftAppointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(draftAppointment.languageFrom, ' - ', draftAppointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("draftAddress.streetName ILIKE :search", { search: searchTerm })
          .orWhere("draftAddress.suburb ILIKE :search", { search: searchTerm })
          .orWhere("draftAddress.state ILIKE :search", { search: searchTerm })
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

  private applyDraftAppointmentOrdering(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto: GetCsvDraftAppointmentsDto,
  ): void {
    if (dto.sortOrder) {
      queryBuilder.addOrderBy("draftAppointment.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("draftAppointment.platformId", dto.platformIdOrder);
    }

    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "draftAppointment.scheduling_type",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "draftAppointment.communication_type",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "draftAppointment.interpreting_type",
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
      const caseStatement = generateCaseForEnumOrder("draftAppointment.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("draftAppointment.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("draftAppointment.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("draftAppointment.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.operatedByCompanyNameOrder) {
      queryBuilder.addOrderBy("draftAppointment.operatedByCompanyName", dto.operatedByCompanyNameOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder
        .addSelect(`COALESCE("clientProfile"."preferred_name", "clientProfile"."first_name")`, "client_name_sort")
        .addOrderBy("client_name_sort", dto.clientFirstNameOrder);
    }
  }

  /**
   ** getUsersCsvData
   */

  public getCsvUsersOptions(
    queryBuilder: SelectQueryBuilder<User>,
    dto: GetCsvUsersDto,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .select([
        "user.id",
        "user.platformId",
        "user.email",
        "user.phoneNumber",
        "user.creationDate",
        "user.updatingDate",
      ])
      .leftJoin("user.userRoles", "userRole")
      .addSelect(["userRole.id", "userRole.accountStatus", "userRole.invitationLinkCreationDate"])
      .leftJoin("userRole.role", "role")
      .addSelect(["role.name"])
      .leftJoin("userRole.address", "address")
      .addSelect(["address.country", "address.state", "address.suburb"])
      .leftJoin("userRole.profile", "profile")
      .addSelect(["profile.firstName", "profile.preferredName", "profile.lastName", "profile.gender"])
      .leftJoin("userRole.naatiProfile", "naatiProfile")
      .addSelect(["naatiProfile.certifiedLanguages"])
      .leftJoin("userRole.interpreterProfile", "interpreterProfile")
      .addSelect([
        "interpreterProfile.isOnlineForAudio",
        "interpreterProfile.isOnlineForVideo",
        "interpreterProfile.isOnlineForFaceToFace",
        "interpreterProfile.endOfWorkDay",
        "interpreterProfile.certificateType",
        "interpreterProfile.onlineSince",
        "interpreterProfile.offlineSince",
        "interpreterProfile.knownLanguages",
      ])
      .leftJoinAndSelect("interpreterProfile.languagePairs", "languagePair")
      .leftJoin("user.avatar", "avatar")
      .addSelect(["avatar.id", "avatar.status"]);

    this.applyUsersFilters(queryBuilder, dto);
    this.applyUsersOrdering(queryBuilder, dto);

    queryBuilder.skip(offset).take(limit);
  }

  private applyUsersFilters(queryBuilder: SelectQueryBuilder<User>, dto: GetCsvUsersDto): void {
    queryBuilder.where("userRole.isInDeleteWaiting = :isInDeleteWaiting", { isInDeleteWaiting: false });

    if (dto.searchField) {
      this.applyUsersSearch(queryBuilder, dto.searchField);
    }

    if (dto.roles && dto.roles.length > 0) {
      queryBuilder.andWhere("role.name IN (:...roles)", { roles: dto.roles });
    }

    if (dto.statuses?.length) {
      queryBuilder.andWhere("userRole.accountStatus IN (:...statuses)", {
        statuses: dto.statuses,
      });
    }

    if (dto.genders?.length) {
      queryBuilder.andWhere("profile.gender IN (:...genders)", {
        genders: dto.genders,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("languagePair.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("languagePair.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.country) {
      queryBuilder.andWhere("address.country = :country", { country: dto.country });
    }

    if (dto.state) {
      queryBuilder.andWhere("address.state = :state", { state: dto.state });
    }

    if (dto.suburb) {
      queryBuilder.andWhere("address.suburb = :suburb", { suburb: dto.suburb });
    }

    if (!dto.roles?.includes(EUserRoleName.LFH_BOOKING_OFFICER)) {
      queryBuilder.andWhere("user.platformId IS NOT NULL");
    }
  }

  private applyUsersSearch(queryBuilder: SelectQueryBuilder<User>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("user.phoneNumber ILIKE :search", { search: searchTerm })
          .orWhere("user.email ILIKE :search", { search: searchTerm })
          .orWhere("address.country ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("CAST(profile.gender AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(userRole.accountStatus AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(languagePair.languageFrom AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(languagePair.languageTo AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("profile"."preferred_name", "profile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("profile.lastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyUsersOrdering(queryBuilder: SelectQueryBuilder<User>, dto: GetCsvUsersDto): void {
    if (dto.accountStatusOrder) {
      const caseStatement = generateCaseForEnumOrder("userRole.accountStatus", accountStatusOrder);
      queryBuilder.addSelect(caseStatement, "account_status_order");
      queryBuilder.addOrderBy("account_status_order", dto.accountStatusOrder);
    }

    if (dto.genderOrder) {
      const caseStatement = generateCaseForEnumOrder("profile.gender", userGenderOrder);
      queryBuilder.addSelect(caseStatement, "gender_order");
      queryBuilder.addOrderBy("gender_order", dto.genderOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("languagePair.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.certificateTypeOrder) {
      const caseStatement = generateCaseForEnumOrder(
        "interpreterProfile.certificateType",
        interpreterCertificateTypeOrder,
      );
      queryBuilder.addSelect(caseStatement, "certificate_type_order");
      queryBuilder.addOrderBy("certificate_type_order", dto.certificateTypeOrder);
    }

    if (dto.languageLevelOrder) {
      const rawOrder = `
          (
            SELECT MAX(
              ${generateCaseForEnumOrder("level", languageLevelOrder)}
            )
            FROM unnest(interpreterProfile.knownLevels) AS level
          )
        `;
      queryBuilder.addSelect(rawOrder, "language_level_order");
      queryBuilder.addOrderBy("language_level_order", dto.languageLevelOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("user.creationDate", dto.sortOrder);
    }

    if (dto.nameOrder) {
      queryBuilder
        .addSelect(`COALESCE("profile"."preferred_name", "profile"."first_name")`, "profile_name_sort")
        .addOrderBy("profile_name_sort", dto.nameOrder);
    }

    if (dto.phoneNumberOrder) {
      queryBuilder.addOrderBy("user.phoneNumber", dto.phoneNumberOrder);
    }

    if (dto.emailOrder) {
      queryBuilder.addOrderBy("user.email", dto.emailOrder);
    }

    if (dto.countryOrder) {
      queryBuilder.addOrderBy("address.country", dto.countryOrder);
    }

    if (dto.stateOrder) {
      queryBuilder.addOrderBy("address.state", dto.stateOrder);
    }

    if (dto.suburbOrder) {
      queryBuilder.addOrderBy("address.suburb", dto.suburbOrder);
    }
  }

  /**
   ** getCompaniesCsvData
   */

  public getCsvCompaniesOptions(
    queryBuilder: SelectQueryBuilder<Company>,
    dto: GetCsvCompaniesDto,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .leftJoinAndSelect("company.address", "address")
      .leftJoinAndSelect("company.superAdmin", "superAdmin")
      .leftJoinAndSelect("superAdmin.avatar", "avatar")
      .where("company.id != :excludedId", { excludedId: COMPANY_LFH_ID });

    this.applyCompanyFilters(queryBuilder, dto);
    this.applyCompanyOrdering(queryBuilder, dto);

    queryBuilder.skip(offset).take(limit);
  }

  private applyCompanyFilters(queryBuilder: SelectQueryBuilder<Company>, dto: GetCsvCompaniesDto): void {
    if (dto.searchField) {
      this.applyCompanySearch(queryBuilder, dto.searchField);
    }

    if (dto.companyType) {
      queryBuilder.andWhere("company.companyType = :companyType", { companyType: dto.companyType });
    }

    if (dto.statuses?.length) {
      queryBuilder.andWhere("company.status IN (:...statuses)", { statuses: dto.statuses });
    }

    if (dto.activitySpheres?.length) {
      queryBuilder.andWhere("company.activitySphere IN (:...activitySpheres)", {
        activitySpheres: dto.activitySpheres,
      });
    }

    if (dto.employeesNumber?.length) {
      queryBuilder.andWhere("company.employeesNumber IN (:...employeesNumber)", {
        employeesNumber: dto.employeesNumber,
      });
    }

    if (dto.country) {
      queryBuilder.andWhere("company.country = :country", { country: dto.country });
    }
  }

  private applyCompanySearch(queryBuilder: SelectQueryBuilder<Company>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("company.name ILIKE :search", { search: searchTerm })
          .orWhere("company.platformId ILIKE :search", { search: searchTerm })
          .orWhere("company.phoneNumber ILIKE :search", { search: searchTerm })
          .orWhere("company.adminEmail ILIKE :search", { search: searchTerm })
          .orWhere("company.contactPerson ILIKE :search", { search: searchTerm })
          .orWhere("CAST(company.activitySphere AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(company.employeesNumber AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(company.country AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(company.status AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyCompanyOrdering(queryBuilder: SelectQueryBuilder<Company>, dto: GetCsvCompaniesDto): void {
    if (dto.statusOrder) {
      const caseStatement = generateCaseForEnumOrder("company.status", companyStatusOrder);
      queryBuilder.addSelect(caseStatement, "company_status_order");
      queryBuilder.addOrderBy("company_status_order", dto.statusOrder);
    }

    if (dto.countryOrder) {
      const caseStatement = generateCaseForEnumOrder("company.country", countryOrder);
      queryBuilder.addSelect(caseStatement, "country_order");
      queryBuilder.addOrderBy("country_order", dto.countryOrder);
    }

    if (dto.activitySphereOrder) {
      const caseStatement = generateCaseForEnumOrder("company.activitySphere", companyActivitySphereOrder);
      queryBuilder.addSelect(caseStatement, "activity_sphere_order");
      queryBuilder.addOrderBy("activity_sphere_order", dto.activitySphereOrder);
    }

    if (dto.employeesNumberOrder) {
      const caseStatement = generateCaseForEnumOrder("company.employeesNumber", companyEmployeesNumberOrder);
      queryBuilder.addSelect(caseStatement, "employees_number_order");
      queryBuilder.addOrderBy("employees_number_order", dto.employeesNumberOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("company.creationDate", dto.sortOrder);
    }

    if (dto.contactPersonOrder) {
      queryBuilder.addOrderBy("company.contactPerson", dto.contactPersonOrder);
    }

    if (dto.companyNameOrder) {
      queryBuilder.addOrderBy("company.name", dto.companyNameOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("company.platformId", dto.platformIdOrder);
    }

    if (dto.phoneNumberOrder) {
      queryBuilder.addOrderBy("company.phoneNumber", dto.phoneNumberOrder);
    }

    if (dto.adminEmailOrder) {
      queryBuilder.addOrderBy("company.adminEmail", dto.adminEmailOrder);
    }
  }

  /**
   ** getEmployeesCsvData
   */

  public getCsvEmployeesOptions(
    queryBuilder: SelectQueryBuilder<UserRole>,
    dto: GetCsvEmployeesDto,
    offset: number,
    limit: number,
  ): void {
    queryBuilder
      .leftJoinAndSelect("userRole.address", "address")
      .leftJoinAndSelect("userRole.profile", "profile")
      .leftJoinAndSelect("userRole.user", "user")
      .leftJoinAndSelect("user.avatar", "avatar")
      .leftJoinAndSelect("userRole.role", "role")
      .andWhere("userRole.isInDeleteWaiting = :isInDeleteWaiting", { isInDeleteWaiting: false })
      .take(offset)
      .skip(limit);

    this.applyEmployeesFilters(queryBuilder, dto);
    this.applyEmployeesOrdering(queryBuilder, dto);
  }

  private applyEmployeesFilters(queryBuilder: SelectQueryBuilder<UserRole>, dto: GetCsvEmployeesDto): void {
    if (dto.searchField) {
      this.applyEmployeesSearch(queryBuilder, dto.searchField);
    }

    if (dto.statuses?.length) {
      queryBuilder.andWhere("userRole.accountStatus IN (:...statuses)", { statuses: dto.statuses });
    }

    if (dto.roles?.length) {
      queryBuilder.andWhere("role.name IN (:...roles)", { roles: dto.roles });
    }
  }

  private applyEmployeesSearch(queryBuilder: SelectQueryBuilder<UserRole>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("user.email ILIKE :search", { search: searchTerm })
          .orWhere("user.phoneNumber ILIKE :search", { search: searchTerm })
          .orWhere("CAST(userRole.accountStatus AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("profile"."preferred_name", "profile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("profile.lastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyEmployeesOrdering(queryBuilder: SelectQueryBuilder<UserRole>, dto: GetCsvEmployeesDto): void {
    if (dto.accountStatusOrder) {
      const caseStatement = generateCaseForEnumOrder("userRole.accountStatus", accountStatusOrder);
      queryBuilder.addSelect(caseStatement, "account_status_order");
      queryBuilder.addOrderBy("account_status_order", dto.accountStatusOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("userRole.creationDate", dto.sortOrder);
    }

    if (dto.nameOrder) {
      queryBuilder
        .addSelect(`COALESCE("profile"."preferred_name", "profile"."first_name")`, "profile_name_sort")
        .addOrderBy("profile_name_sort", dto.nameOrder);
    }

    if (dto.userRoleOrder) {
      queryBuilder.addOrderBy("role.name", dto.userRoleOrder);
    }

    if (dto.phoneNumberOrder) {
      queryBuilder.addOrderBy("user.phoneNumber", dto.phoneNumberOrder);
    }

    if (dto.emailOrder) {
      queryBuilder.addOrderBy("user.email", dto.emailOrder);
    }

    if (dto.suburbOrder) {
      queryBuilder.addOrderBy("address.suburb", dto.suburbOrder);
    }
  }
}
