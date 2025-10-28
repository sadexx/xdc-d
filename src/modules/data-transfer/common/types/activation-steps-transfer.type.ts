import { User, UserDocument, UserProfile } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { AbnCheck } from "src/modules/abn/entities";
import { BackyCheck } from "src/modules/backy-check/entities";
import { EntityTarget, FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { QueryResultType } from "src/common/types";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { CustomInsurance } from "src/modules/interpreters/profile/entities";

/**
 ** Type
 */

export type TDataTransferFromExistingRolesToNewRoleUserRole =
  TDataTransferFromExistingRolesToNewRole["userRoles"][number];

export type TTransferEntity<T> = {
  entity: EntityTarget<T>;
  data: QueryDeepPartialEntity<T>;
};

export type TTransferEntities =
  | UserProfile
  | Address
  | SumSubCheck
  | AbnCheck
  | BackyCheck
  | UserConcessionCard
  | CustomInsurance
  | UserDocument;

/**
 ** Query types
 */

export const DataTransferFromExistingRolesToNewRoleQuery = {
  select: {
    id: true,
    userRoles: {
      id: true,
      userId: true,
      isActive: true,
      country: true,
      timezone: true,
      role: { name: true },
      profile: {
        title: true,
        firstName: true,
        middleName: true,
        lastName: true,
        preferredName: true,
        dateOfBirth: true,
        gender: true,
        contactEmail: true,
        nativeLanguage: true,
        isIdentifyAsAboriginalOrTorresStraitIslander: true,
      },
      address: {
        country: true,
        streetNumber: true,
        streetName: true,
        suburb: true,
        state: true,
        postcode: true,
        latitude: true,
        longitude: true,
        organizationName: true,
        building: true,
        unit: true,
        timezone: true,
      },
      sumSubCheck: {
        reviewAnswer: true,
        applicantId: true,
        inspectionId: true,
        applicantType: true,
        correlationId: true,
        levelName: true,
        sandboxMode: true,
        externalUserId: true,
        webhookType: true,
        reviewStatus: true,
        moderationComment: true,
        clientComment: true,
        rejectLabels: true,
        reviewRejectType: true,
        buttonIds: true,
      },
      abnCheck: {
        abnStatus: true,
        abnNumber: true,
        abnStatusEffectiveFrom: true,
        acn: true,
        addressDate: true,
        addressPostcode: true,
        addressState: true,
        businessName: true,
        fullName: true,
        typeCode: true,
        typeName: true,
        gst: true,
        gstFromClient: true,
        message: true,
      },
      backyCheck: {
        checkStatus: true,
        manualCheckResults: true,
        WWCCNumber: true,
        expiredDate: true,
        issueState: true,
        orderId: true,
        checkResults: true,
        checkResultsNotes: true,
        orderOfficerNotes: true,
        document: { s3Key: true, documentType: true },
      },
      userConcessionCard: {
        status: true,
        centerlinkPensionerConcessionCardNumber: true,
        veteranAffairsPensionerConcessionCardNumber: true,
        document: { s3Key: true, documentType: true },
      },
      customInsurance: { insuredParty: true, insuranceCompany: true, policyNumber: true, coverageLimit: true },
      user: { id: true, email: true },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: {
    userRoles: {
      role: true,
      profile: true,
      address: true,
      sumSubCheck: true,
      abnCheck: true,
      backyCheck: { document: true },
      userConcessionCard: { document: true },
      customInsurance: true,
      user: true,
    },
  } as const satisfies FindOptionsRelations<User>,
};
export type TDataTransferFromExistingRolesToNewRole = QueryResultType<
  User,
  typeof DataTransferFromExistingRolesToNewRoleQuery.select
>;
