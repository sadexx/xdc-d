import { Injectable } from "@nestjs/common";
import { GetUserDocumentsDto, GetUserPaymentsDto, GetUsersDto } from "src/modules/admin/common/dto";
import { Brackets, FindOneOptions, SelectQueryBuilder } from "typeorm";
import { User } from "src/modules/users/entities";
import { generateCaseForEnumOrder } from "src/common/utils";
import {
  interpreterCertificateTypeOrder,
  languageLevelOrder,
  languageOrder,
} from "src/modules/interpreters/profile/common/enum";
import { accountStatusOrder, EAccountStatus, EUserRoleName, userGenderOrder } from "src/modules/users/common/enums";
import { UserRole } from "src/modules/users/entities";
import { DUE_PAYMENT_STATUSES } from "src/common/constants";
import { membershipTypeOrder } from "src/modules/memberships/common/enums";
import { Payment } from "src/modules/payments/entities";
import {
  EPaymentDirection,
  EPaymentReceiptType,
  paymentMethodFilterMap,
  paymentStatusOrder,
} from "src/modules/payments/common/enums/core";
import { LoadPaymentForStatusChangeQuery } from "src/modules/admin/common/types";

@Injectable()
export class AdminQueryOptionsService {
  public getUsersOptions(queryBuilder: SelectQueryBuilder<User>, dto: GetUsersDto): void {
    queryBuilder
      .select([
        "user.id",
        "user.platformId",
        "user.email",
        "user.phoneNumber",
        "user.isInDeleteWaiting",
        "user.deletingDate",
        "user.creationDate",
        "user.updatingDate",
      ])
      .leftJoin("user.userRoles", "userRole")
      .addSelect([
        "userRole.id",
        "userRole.accountStatus",
        "userRole.invitationLinkCreationDate",
        "userRole.operatedByCompanyId",
        "userRole.isInDeleteWaiting",
        "userRole.deletingDate",
      ])
      .leftJoin("userRole.discountHolder", "discountHolder")
      .addSelect(["discountHolder.id"])
      .leftJoin("discountHolder.membershipAssignment", "membershipAssignment")
      .addSelect(["membershipAssignment.id"])
      .leftJoin("membershipAssignment.currentMembership", "currentMembership")
      .addSelect(["currentMembership.type"])
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
      ])
      .leftJoinAndSelect("interpreterProfile.languagePairs", "languagePair")
      .leftJoin("user.avatar", "avatar")
      .addSelect(["avatar.id", "avatar.status"]);

    this.applyFiltersForUsers(queryBuilder, dto);
    this.applyOrderingForUsers(queryBuilder, dto);

    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  private applyFiltersForUsers(queryBuilder: SelectQueryBuilder<User>, dto: GetUsersDto): void {
    if (dto.searchField) {
      this.applySearchForUsers(queryBuilder, dto.searchField);
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

    const isFilteringStartRegistration = dto.statuses?.includes(EAccountStatus.START_REGISTRATION);
    const isIncludingBookingOfficer = dto.roles?.includes(EUserRoleName.LFH_BOOKING_OFFICER);

    if (!isFilteringStartRegistration && !isIncludingBookingOfficer) {
      queryBuilder.andWhere("user.platformId IS NOT NULL");
    }
  }

  private applySearchForUsers(queryBuilder: SelectQueryBuilder<User>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("user.phoneNumber ILIKE :search", { search: searchTerm })
          .orWhere("user.email ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(profile.firstName, ' ', profile.lastName) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.country ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("CAST(profile.gender AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(userRole.accountStatus AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(languagePair.languageFrom AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(languagePair.languageTo AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrderingForUsers(queryBuilder: SelectQueryBuilder<User>, dto: GetUsersDto): void {
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

    if (dto.membershipTypeOrder) {
      const caseStatement = generateCaseForEnumOrder("currentMembership.type", membershipTypeOrder);
      queryBuilder.addSelect(caseStatement, "membership_type_order");
      queryBuilder.addOrderBy("membership_type_order", dto.membershipTypeOrder);
    }

    if (dto.languageLevelOrder) {
      const rawOrder = `
        (SELECT MAX(${generateCaseForEnumOrder("level", languageLevelOrder)})
        FROM unnest(interpreterProfile.knownLevels) AS level)
      `;
      queryBuilder.addSelect(rawOrder, "language_level_order");
      queryBuilder.addOrderBy("language_level_order", dto.languageLevelOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("user.creationDate", dto.sortOrder);
    }

    if (dto.nameOrder) {
      queryBuilder.addOrderBy("profile.firstName", dto.nameOrder);
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

  public getUserDocumentsOptions(dto: GetUserDocumentsDto): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
        userId: true,
        sumSubCheck: {
          id: true,
          reviewStatus: true,
          reviewAnswer: true,
        },
        abnCheck: {
          id: true,
          abnStatus: true,
          abnNumber: true,
          message: true,
          gstFromClient: true,
        },
        docusignContracts: {
          id: true,
          docusignStatus: true,
        },
        naatiProfile: {
          id: true,
          practitionerCpn: true,
          certifiedLanguages: true,
        },
        backyCheck: {
          id: true,
          WWCCNumber: true,
          expiredDate: true,
          checkStatus: true,
          issueState: true,
          document: {
            id: true,
            documentType: true,
            creationDate: true,
            updatingDate: true,
          },
        },
        ieltsCheck: {
          id: true,
          status: true,
          trfNumber: true,
        },
        userConcessionCard: {
          id: true,
          centerlinkPensionerConcessionCardNumber: true,
          veteranAffairsPensionerConcessionCardNumber: true,
          status: true,
          document: {
            id: true,
            documentType: true,
            creationDate: true,
            updatingDate: true,
          },
        },
        languageDocChecks: {
          id: true,
          pteScoreReportCode: true,
          pteTestRegistrationId: true,
          status: true,
          document: {
            id: true,
            documentType: true,
            creationDate: true,
            updatingDate: true,
          },
        },
        rightToWorkChecks: {
          id: true,
          languageFrom: true,
          languageTo: true,
          documentName: true,
          status: true,
          document: {
            id: true,
            documentType: true,
            creationDate: true,
            updatingDate: true,
          },
        },
        customInsurance: {
          id: true,
          insuredParty: true,
          insuranceCompany: true,
          policyNumber: true,
          coverageLimit: true,
        },
        paymentInformation: {
          stripeClientLastFour: true,
          interpreterSystemForPayout: true,
          stripeInterpreterOnboardingStatus: true,
          stripeInterpreterBankAccountLast4: true,
          stripeInterpreterCardLast4: true,
          paypalEmail: true,
        },
      },
      where: { userId: dto.id, role: { name: dto.userRole } },
      relations: {
        sumSubCheck: true,
        abnCheck: true,
        docusignContracts: true,
        naatiProfile: true,
        backyCheck: {
          document: true,
        },
        ieltsCheck: true,
        userConcessionCard: {
          document: true,
        },
        languageDocChecks: {
          document: true,
        },
        rightToWorkChecks: {
          document: true,
        },
        customInsurance: true,
        interpreterProfile: {
          languagePairs: true,
        },
        paymentInformation: true,
      },
    };
  }

  public getUserProfileOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
        isUserAgreedToTermsAndConditions: true,
        isRegistrationFinished: true,
        isRequiredInfoFulfilled: true,
        isActive: true,
        accountStatus: true,
        lastDeactivationDate: true,
        country: true,
        operatedByCompanyId: true,
        interpreterProfile: {
          audioOnDemandSetting: true,
          videoOnDemandSetting: true,
          faceToFaceOnDemandSetting: true,
          audioPreBookedSetting: true,
          videoPreBookedSetting: true,
          faceToFacePreBookedSetting: true,
          consecutiveLegalSetting: true,
          consecutiveMedicalSetting: true,
          conferenceSimultaneousSetting: true,
          consecutiveGeneralSetting: true,
          signLanguageSetting: true,
          averageRating: true,
          interpreterBadge: true,
        },
        role: {
          name: true,
        },
        user: {
          id: true,
          platformId: true,
          email: true,
          isEmailVerified: true,
          phoneNumber: true,
          isTwoStepVerificationEnabled: true,
          isRegistrationFinished: true,
          isDefaultAvatar: true,
          avatarUrl: true,
          userRoles: {
            id: true,
          },
        },
        creationDate: true,
      },
      where: { id: userRoleId },
      relations: {
        profile: true,
        address: true,
        role: true,
        user: {
          avatar: true,
          userRoles: true,
        },
        questionnaire: {
          recommendations: true,
        },
        interpreterProfile: true,
        discountHolder: {
          promoCampaignAssignment: { promoCampaign: true },
          membershipAssignment: { currentMembership: true },
        },
      },
    };
  }

  public getUserPaymentsOptions(queryBuilder: SelectQueryBuilder<Payment>, dto: GetUserPaymentsDto): void {
    queryBuilder
      .select([
        "payment.id",
        "payment.platformId",
        "payment.totalFullAmount",
        "payment.totalGstAmount",
        "payment.currency",
        "payment.paymentMethodInfo",
        "payment.receipt",
        "payment.taxInvoice",
        "payment.note",
        "payment.isDepositCharge",
        "payment.membershipId",
        "payment.updatingDate",
      ])
      .leftJoin("payment.appointment", "appointment")
      .addSelect(["appointment.id", "appointment.platformId", "appointment.scheduledStartTime"])
      .leftJoin("payment.fromClient", "fromClient")
      .addSelect("fromClient.id")
      .leftJoin("fromClient.user", "user")
      .addSelect(["user.id", "user.platformId"])
      .leftJoin("payment.company", "company")
      .addSelect(["company.id", "company.platformId"])
      .leftJoin("payment.items", "item")
      .addSelect([
        "item.id",
        "item.amount",
        "item.gstAmount",
        "item.fullAmount",
        "item.currency",
        "item.status",
        "item.receipt",
        "item.note",
        "item.creationDate",
        "item.updatingDate",
      ]);

    this.applyFiltersForUserPayments(queryBuilder, dto);
    this.applyOrderingForUserPayments(queryBuilder, dto);
    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  public applyFiltersForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, dto: GetUserPaymentsDto): void {
    if (dto.searchField) {
      this.applySearchForUserPayments(queryBuilder, dto.searchField);
    }

    if (dto.userRoleId) {
      queryBuilder.andWhere("payment.fromClientId = :userRoleId OR payment.toInterpreterId = :userRoleId", {
        userRoleId: dto.userRoleId,
      });
    } else if (dto.companyId) {
      queryBuilder.andWhere("company.id = :companyId", { companyId: dto.companyId });
    }

    if (dto.receiptType) {
      switch (dto.receiptType) {
        case EPaymentReceiptType.INVOICE:
          queryBuilder.andWhere("payment.direction = :incoming", { incoming: EPaymentDirection.INCOMING });
          break;
        case EPaymentReceiptType.REMITTANCE_ADVICE:
          queryBuilder.andWhere("payment.direction = :outcoming", { outcoming: EPaymentDirection.OUTCOMING });
          break;
        case EPaymentReceiptType.TAX_INVOICE:
          queryBuilder
            .andWhere("payment.direction = :outcoming", { outcoming: EPaymentDirection.OUTCOMING })
            .andWhere("payment.totalGstAmount > 0");
          break;
      }
    }

    if (dto.paymentMethod) {
      const paymentMethod = paymentMethodFilterMap[dto.paymentMethod];
      queryBuilder.andWhere("payment.paymentMethodInfo LIKE :paymentMethod", {
        paymentMethod: `%${paymentMethod}%`,
      });
    }

    if (dto.statuses?.length) {
      const lastStatusCase = `
      (SELECT item.status
        FROM payment_items item
        WHERE item.payment_id = payment.id
        ORDER BY item.updating_date DESC
        LIMIT 1)
      `;
      queryBuilder.andWhere(`${lastStatusCase} IN (:...statuses)`, { statuses: dto.statuses });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("DATE(appointment.scheduledStartTime) BETWEEN :startDate::date AND :endDate::date", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }
  }

  private applySearchForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("company.platformId ILIKE :search", { search: searchTerm })
          .orWhere("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(payment.totalFullAmount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(payment.totalGstAmount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(item.status AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  public applyOrderingForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, dto: GetUserPaymentsDto): void {
    if (dto.sortOrder) {
      queryBuilder.addOrderBy("payment.updatingDate", dto.sortOrder);
    }

    if (dto.appointmentDateOrder) {
      queryBuilder.addOrderBy("appointment.scheduledStartTime", dto.appointmentDateOrder);
    }

    if (dto.amountOrder) {
      const orderField =
        dto.receiptType === EPaymentReceiptType.TAX_INVOICE ? "payment.totalGstAmount" : "payment.totalFullAmount";
      queryBuilder.addOrderBy(orderField, dto.amountOrder);
    }

    if (dto.dueDateOrder) {
      const lastDueItemDateCase = `
      (SELECT item.updating_date
        FROM payment_items item
        WHERE item.payment_id = payment.id
          AND item.status IN (:...dueStatuses)
        ORDER BY item.updatingDate DESC
        LIMIT 1)
      `;
      queryBuilder.addSelect(lastDueItemDateCase, "due_date_order");
      queryBuilder.addOrderBy("due_date_order", dto.dueDateOrder);
      queryBuilder.setParameter("dueStatuses", DUE_PAYMENT_STATUSES);
    }

    if (dto.statusOrder) {
      const lastStatusSQL = `
      (SELECT item.status
        FROM payment_items item
        WHERE item.payment_id = payment.id
        ORDER BY item.updating_date DESC
        LIMIT 1)
      `;
      const caseStatement = generateCaseForEnumOrder(lastStatusSQL, paymentStatusOrder);
      queryBuilder.addSelect(caseStatement, "item_status_order");
      queryBuilder.addOrderBy("item_status_order", dto.statusOrder);
    }

    if (dto.invoiceNumberOrder) {
      const invoiceNumberCase = `
        CASE
          WHEN payment.membershipId IS NOT NULL AND payment.fromClient IS NOT NULL
            THEN CONCAT(user.platform_id, '-', payment.platform_id)
          WHEN payment.isDepositCharge = true AND company.id IS NOT NULL
            THEN CONCAT(company.platform_id, '-', payment.platform_id)
          ELSE appointment.platform_id
        END
      `;
      queryBuilder.addSelect(invoiceNumberCase, "invoice_number_order");
      queryBuilder.addOrderBy("invoice_number_order", dto.invoiceNumberOrder);
    }
  }

  public loadPaymentForStatusChangeOptions(paymentId: string): FindOneOptions<Payment> {
    return {
      select: LoadPaymentForStatusChangeQuery.select,
      where: { id: paymentId },
      relations: LoadPaymentForStatusChangeQuery.relations,
    };
  }
}
