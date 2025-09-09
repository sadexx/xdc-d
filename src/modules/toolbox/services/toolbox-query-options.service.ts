import { Injectable } from "@nestjs/common";
import { Brackets, SelectQueryBuilder } from "typeorm";
import { User } from "src/modules/users/entities";
import {
  GetAvailableLanguagePairsDto,
  GetDropdownCompaniesDto,
  GetDropdownUsersDto,
} from "src/modules/toolbox/common/dto";
import { ESortOrder } from "src/common/enums";
import { Company } from "src/modules/companies/entities";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { ECompanyStatus, ECompanyType } from "src/modules/companies/common/enums";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { UserRole } from "src/modules/users/entities";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { ADMIN_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { isInRoles } from "src/common/utils";
import { EChannelType, EChannelStatus } from "src/modules/chime-messaging-configuration/common/enums";

@Injectable()
export class ToolboxQueryOptionsService {
  public getActiveLanguagesOptions(): string {
    return `
      SELECT DISTINCT language
      FROM (
        SELECT "language_from"::TEXT AS language FROM language_pairs
        UNION ALL
        SELECT "language_to"::TEXT AS language FROM language_pairs
      ) AS unique_languages;
    `;
  }

  public getDropdownCompaniesOptions(queryBuilder: SelectQueryBuilder<Company>, dto: GetDropdownCompaniesDto): void {
    queryBuilder
      .select(["company.id", "company.platformId", "company.name"])
      .addOrderBy("company.creationDate", ESortOrder.ASC);
    this.applyFiltersForDropdownCompanies(queryBuilder, dto);
  }

  private applyFiltersForDropdownCompanies(
    queryBuilder: SelectQueryBuilder<Company>,
    dto: GetDropdownCompaniesDto,
  ): void {
    if (dto.companyTypes) {
      queryBuilder.andWhere("company.companyType IN (:...companyTypes)", { companyTypes: dto.companyTypes });
    }

    if (dto.searchField) {
      this.applySearchForDropdownCompanies(queryBuilder, dto.searchField);
    }
  }

  private applySearchForDropdownCompanies(queryBuilder: SelectQueryBuilder<Company>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("company.platformId ILIKE :search", { search: searchTerm }).orWhere("company.name ILIKE :search", {
          search: searchTerm,
        });
      }),
    );
  }

  public getDropdownUsersOptions(
    queryBuilder: SelectQueryBuilder<User>,
    dto: GetDropdownUsersDto,
    userRole: UserRole,
  ): void {
    queryBuilder
      .select(["user.platformId"])
      .leftJoin("user.userRoles", "userRole")
      .addSelect(["userRole.id", "userRole.operatedByCompanyId"])
      .leftJoin("userRole.role", "role")
      .addSelect(["role.name"])
      .leftJoin("userRole.profile", "profile")
      .addSelect(["profile.firstName", "profile.preferredName", "profile.lastName"])
      .leftJoin("userRole.interpreterProfile", "interpreterProfile")
      .addSelect(["interpreterProfile.id"])
      .leftJoin("interpreterProfile.languagePairs", "languagePair")
      .addSelect(["languagePair.languageFrom", "languagePair.languageTo"])
      .andWhere("user.isInDeleteWaiting = :isInDeleteWaiting AND userRole.isInDeleteWaiting = :isInDeleteWaiting", {
        isInDeleteWaiting: false,
      });

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder.andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }

    this.applyFiltersForDropdownUsers(queryBuilder, dto);
  }

  private applyFiltersForDropdownUsers(queryBuilder: SelectQueryBuilder<User>, dto: GetDropdownUsersDto): void {
    queryBuilder.andWhere("role.name IN (:...roles)", { roles: dto.roles });
    queryBuilder.andWhere("userRole.isActive = true");

    if (dto.operatedByCompanyId) {
      queryBuilder.andWhere("userRole.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: dto.operatedByCompanyId,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("languagePair.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("languagePair.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.searchField) {
      this.applySearchForDropdownUsers(queryBuilder, dto.searchField);
    }
  }

  private applySearchForDropdownUsers(queryBuilder: SelectQueryBuilder<User>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere(
            `COALESCE("profile"."preferred_name", "profile"."first_name") 
            ILIKE :search`,
            { search: searchTerm },
          )
          .orWhere("profile.lastName ILIKE :search", { search: searchTerm });
      }),
    );
  }

  public hasNewCompanyRequestsQueryOptions(queryBuilder: SelectQueryBuilder<Company>): void {
    queryBuilder
      .leftJoin("contact_forms", "contactForm", "TRUE")
      .where(
        "((company.status = :status AND company.subStatus IS NULL) OR (contactForm.isViewed = false)) AND company.companyType != :type",
        { status: ECompanyStatus.NEW_REQUEST, type: ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS },
      );
  }

  public hasAppointmentOrdersQueryOptions(
    queryBuilder: SelectQueryBuilder<AppointmentOrder>,
    userRoleId: string,
  ): void {
    queryBuilder
      .leftJoin("order.appointmentOrderGroup", "orderGroup")
      .where("order.matchedInterpreterIds @> ARRAY[:userRoleId]::uuid[]", { userRoleId })
      .orWhere("orderGroup.matchedInterpreterIds @> ARRAY[:userRoleId]::uuid[]", { userRoleId });
  }

  public hasUnreadSupportChannelMessagesQueryOptions(
    queryBuilder: SelectQueryBuilder<ChannelMembership>,
    user: IWebSocketUserData,
  ): void {
    if (isInRoles(ADMIN_ROLES, user.role)) {
      queryBuilder.innerJoin("channelMembership.channel", "channel").andWhere(
        new Brackets((queryBuilder) => {
          queryBuilder
            .where("channel.operatedByCompanyId = :operatedByCompanyId", {
              operatedByCompanyId: user.operatedByCompanyId,
            })
            .andWhere("channel.type = :type", { type: EChannelType.SUPPORT })
            .andWhere("channel.status = :status", { status: EChannelStatus.NEW })
            .orWhere(
              new Brackets((subQueryBuilder) => {
                subQueryBuilder
                  .where("channelMembership.userRole.id = :userRoleId", { userRoleId: user.userRoleId })
                  .andWhere("channelMembership.unreadMessagesCount != 0");
              }),
            );
        }),
      );
    } else {
      queryBuilder
        .innerJoin("channelMembership.channel", "channel")
        .andWhere("channelMembership.userRole.id = :userRoleId", { userRoleId: user.userRoleId })
        .andWhere("channelMembership.unreadMessagesCount != 0")
        .andWhere("channel.type = :type", { type: EChannelType.SUPPORT });
    }
  }

  public hasUnreadPrivateChannelMessagesQueryOptions(
    queryBuilder: SelectQueryBuilder<ChannelMembership>,
    user: IWebSocketUserData,
  ): void {
    queryBuilder
      .innerJoin("channelMembership.channel", "channel")
      .andWhere("channel.type = :type", { type: EChannelType.PRIVATE })
      .andWhere("channelMembership.userRole.id = :userRoleId", { userRoleId: user.userRoleId })
      .andWhere("channelMembership.unreadMessagesCount != 0");
  }

  public busyInterpretersQueryOptions(queryBuilder: SelectQueryBuilder<Appointment>, userRole: UserRole): void {
    queryBuilder
      .select("appointment.interpreterId", "interpreterId")
      .where("appointment.status = :status", { status: EAppointmentStatus.LIVE });

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder
        .innerJoin("appointment.interpreter", "userRole")
        .andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }
  }

  public onlineInterpretersQueryOptions(
    queryBuilder: SelectQueryBuilder<InterpreterProfile>,
    currentTime: Date,
    busyInterpreterIds: string[],
    userRole: UserRole,
  ): void {
    queryBuilder
      .where(
        `(interpreterProfile.isOnlineForAudio = true
       OR interpreterProfile.isOnlineForVideo = true
       OR interpreterProfile.isOnlineForFaceToFace = true)`,
      )
      .andWhere("interpreterProfile.endOfWorkDay > :currentTime", { currentTime })
      .andWhere(
        busyInterpreterIds.length ? "interpreterProfile.user_role_id NOT IN (:...busyInterpreterIds)" : "TRUE",
        { busyInterpreterIds },
      );

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder
        .innerJoin("interpreterProfile.userRole", "userRole")
        .andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }
  }

  public offlineInterpretersQueryOptions(
    queryBuilder: SelectQueryBuilder<UserRole>,
    currentTime: Date,
    busyInterpreterIds: string[],
    userRole: UserRole,
  ): void {
    queryBuilder
      .leftJoinAndSelect("userRole.interpreterProfile", "interpreterProfile")
      .leftJoin("userRole.role", "role")
      .where(
        `(
          interpreterProfile.id IS NULL
          OR
          (
            (interpreterProfile.isOnlineForAudio = false
             AND interpreterProfile.isOnlineForVideo = false
             AND interpreterProfile.isOnlineForFaceToFace = false)
            OR
            (
              (interpreterProfile.isOnlineForAudio = true
               OR interpreterProfile.isOnlineForVideo = true
               OR interpreterProfile.isOnlineForFaceToFace = true)
              AND interpreterProfile.endOfWorkDay < :currentTime
            )
          )
        )
        AND role.name IN (:...roles)
        ${busyInterpreterIds.length ? `AND userRole.id NOT IN (:...busyInterpreterIds)` : ""}`,
        { currentTime, busyInterpreterIds, roles: INTERPRETER_ROLES },
      );

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder.andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }
  }

  public getAvailableLanguagePairsOptions(dto: GetAvailableLanguagePairsDto): {
    query: string;
    parameters: (string | number)[];
  } {
    const query = `SELECT DISTINCT language
				FROM (
					SELECT language_to::text AS language
					FROM language_pairs
					WHERE language_from::text = $1
					UNION
					SELECT language_from::text AS language
					FROM language_pairs
					WHERE language_to::text = $1
				) AS combined_available_languages`;

    return { query, parameters: [dto.language] };
  }
}
