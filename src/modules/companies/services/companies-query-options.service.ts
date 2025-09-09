import { Injectable } from "@nestjs/common";
import { Brackets, SelectQueryBuilder } from "typeorm";
import { Company } from "src/modules/companies/entities";
import { GetCompaniesDto, GetEmployeesDto } from "src/modules/companies/common/dto";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { generateCaseForEnumOrder } from "src/common/utils";
import { countryOrder } from "src/modules/addresses/common/enums";
import {
  companyActivitySphereOrder,
  companyEmployeesNumberOrder,
  companyStatusOrder,
} from "src/modules/companies/common/enums";
import { UserRole } from "src/modules/users/entities";
import { accountStatusOrder } from "src/modules/users/common/enums";

@Injectable()
export class CompaniesQueryOptionsService {
  public getCompaniesOptions(queryBuilder: SelectQueryBuilder<Company>, dto: GetCompaniesDto): void {
    queryBuilder
      .leftJoinAndSelect("company.address", "address")
      .leftJoinAndSelect("company.superAdmin", "superAdmin")
      .leftJoinAndSelect("superAdmin.avatar", "avatar")
      .where("company.id != :excludedId", { excludedId: COMPANY_LFH_ID });

    if (dto.operatedByMainCompanyId) {
      queryBuilder.andWhere("company.operatedByMainCompanyId = :operatedByMainCompanyId", {
        operatedByMainCompanyId: dto.operatedByMainCompanyId,
      });
    }

    this.applyCompanyFilters(queryBuilder, dto);
    this.applyCompanyOrdering(queryBuilder, dto);

    queryBuilder.take(dto.limit).skip(dto.offset);
  }

  private applyCompanyFilters(queryBuilder: SelectQueryBuilder<Company>, dto: GetCompaniesDto): void {
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

  private applyCompanyOrdering(queryBuilder: SelectQueryBuilder<Company>, dto: GetCompaniesDto): void {
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

    if (dto.operatedByCompanyNameOrder) {
      queryBuilder.addOrderBy("company.operatedByCompanyName", dto.operatedByCompanyNameOrder);
    }
  }

  public getAllEmployeesOptions(queryBuilder: SelectQueryBuilder<UserRole>, dto: GetEmployeesDto): void {
    queryBuilder
      .leftJoinAndSelect("userRole.address", "address")
      .leftJoinAndSelect("userRole.profile", "profile")
      .leftJoinAndSelect("userRole.user", "user")
      .leftJoinAndSelect("user.avatar", "avatar")
      .leftJoinAndSelect("userRole.role", "role")
      .andWhere("userRole.isInDeleteWaiting = :isInDeleteWaiting", { isInDeleteWaiting: false })
      .take(dto.limit)
      .skip(dto.offset);

    this.applyEmployeesFilters(queryBuilder, dto);
    this.applyEmployeesOrdering(queryBuilder, dto);
  }

  private applyEmployeesFilters(queryBuilder: SelectQueryBuilder<UserRole>, dto: GetEmployeesDto): void {
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

  private applyEmployeesOrdering(queryBuilder: SelectQueryBuilder<UserRole>, dto: GetEmployeesDto): void {
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
