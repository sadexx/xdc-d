import { Injectable } from "@nestjs/common";
import { Brackets, FindManyOptions, FindOneOptions, FindOptionsWhere, SelectQueryBuilder } from "typeorm";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { UserRole } from "src/modules/users/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { GetAllDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { generateCaseForEnumOrder, isInRoles } from "src/common/utils";
import {
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentSchedulingTypeOrder,
  appointmentTopicOrder,
} from "src/modules/appointments/appointment/common/enums";
import { languageOrder } from "src/modules/interpreters/profile/common/enum";
import {
  CLIENT_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
  LFH_ADMIN_ROLES,
} from "src/common/constants";

@Injectable()
export class DraftAppointmentQueryOptionsService {
  public getAllDraftAppointmentsForAdminOptions(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto: GetAllDraftAppointmentsDto,
    adminUserRole: UserRole,
  ): void {
    queryBuilder
      .select([
        "draftAppointment.id",
        "draftAppointment.platformId",
        "draftAppointment.scheduledStartTime",
        "draftAppointment.schedulingDurationMin",
        "draftAppointment.languageFrom",
        "draftAppointment.languageTo",
        "draftAppointment.status",
        "draftAppointment.communicationType",
        "draftAppointment.interpreterType",
        "draftAppointment.interpretingType",
        "draftAppointment.schedulingType",
        "draftAppointment.topic",
        "draftAppointment.creationDate",
      ])
      .leftJoin("draftAppointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.preferredName", "clientProfile.lastName"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.platformId"])
      .leftJoin("client.role", "clientRole")
      .addSelect(["clientRole.name"])
      .leftJoin("draftAppointment.draftAddress", "draftAddress")
      .addSelect([
        "draftAddress.id",
        "draftAddress.latitude",
        "draftAddress.longitude",
        "draftAddress.country",
        "draftAddress.state",
        "draftAddress.suburb",
        "draftAddress.streetName",
        "draftAddress.streetNumber",
        "draftAddress.postcode",
        "draftAddress.building",
        "draftAddress.unit",
      ]);

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, adminUserRole.role.name)) {
      queryBuilder.andWhere("client.operatedByMainCorporateCompanyId = :operatedByMainCorporateCompanyId", {
        operatedByMainCorporateCompanyId: adminUserRole.operatedByCompanyId,
      });
    } else if (!isInRoles(LFH_ADMIN_ROLES, adminUserRole.role.name)) {
      queryBuilder.andWhere("client.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: adminUserRole.operatedByCompanyId,
      });
    }

    if (dto) {
      this.applyFiltersForAdmin(queryBuilder, dto);
      this.applyOrdering(queryBuilder, dto);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  private applyFiltersForAdmin(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto: GetAllDraftAppointmentsDto,
  ): void {
    if (dto.searchField) {
      this.applySearchForAdmin(queryBuilder, dto.searchField);
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

    if (dto.clientId) {
      queryBuilder.andWhere("draftAppointment.clientId = :clientId", {
        clientId: dto.clientId,
      });
    }
  }

  private applySearchForAdmin(queryBuilder: SelectQueryBuilder<DraftAppointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.andWhere("draftAppointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(draftAppointment.languageFrom, ' - ', draftAppointment.languageTo) ILIKE :search", {
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

  private applyOrdering(queryBuilder: SelectQueryBuilder<DraftAppointment>, dto: GetAllDraftAppointmentsDto): void {
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

    if (dto.clientFirstNameOrder) {
      queryBuilder
        .addSelect(`COALESCE("clientProfile"."preferred_name", "clientProfile"."first_name")`, "client_name_sort")
        .addOrderBy("client_name_sort", dto.clientFirstNameOrder);
    }
  }

  public getAllDraftAppointmentsForClientOptions(userRoleId: string): FindManyOptions<DraftAppointment> {
    return {
      select: {
        id: true,
        platformId: true,
        interpreterType: true,
        schedulingType: true,
        communicationType: true,
        interpretingType: true,
        scheduledStartTime: true,
        schedulingDurationMin: true,
        languageFrom: true,
        languageTo: true,
        status: true,
        topic: true,
        creationDate: true,
        draftAddress: {
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
        },
      },
      where: {
        clientId: userRoleId,
      },
      relations: {
        draftAddress: true,
      },
    };
  }

  public getDraftAppointmentForClientOptions(id: string, userRoleId: string): FindOneOptions<DraftAppointment> {
    return {
      where: {
        id: id,
        clientId: userRoleId,
      },
      relations: {
        draftParticipants: true,
        draftAddress: true,
        draftExtraDays: {
          draftAddress: true,
        },
      },
    };
  }

  public getDraftAppointmentForAdminOptions(id: string): FindOneOptions<DraftAppointment> {
    return {
      select: {
        client: {
          id: true,
          user: {
            id: true,
            platformId: true,
            avatarUrl: true,
          },
          profile: {
            firstName: true,
            preferredName: true,
            lastName: true,
            gender: true,
          },
        },
      },
      where: {
        id: id,
      },
      relations: {
        client: {
          user: true,
          profile: true,
        },
        draftParticipants: true,
        draftAddress: true,
        draftExtraDays: {
          draftAddress: true,
        },
      },
    };
  }

  public getClientForCreateDraftAppointmentOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByCompanyName: true,
        user: {
          id: true,
          email: true,
        },
      },
      where: { id: userRoleId },
      relations: {
        role: true,
        user: true,
      },
    };
  }

  public getDeleteDraftAppointmentOptions(id: string, user: ITokenUserData): FindOptionsWhere<UserRole> {
    const queryOptions: FindOptionsWhere<DraftAppointment> = {
      id: id,
    };

    if (isInRoles(CLIENT_ROLES, user.role)) {
      queryOptions.clientId = user.userRoleId;
    }

    return queryOptions;
  }
}
