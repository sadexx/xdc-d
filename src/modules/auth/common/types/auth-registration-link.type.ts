import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TResendRegistrationLinkUserRole = TResendRegistrationLink["userRoles"][number];

export type TValidateInvitationLinkTimeLimit = Pick<UserRole, "invitationLinkCreationDate">;

/**
 ** Query types
 */

export const ResendRegistrationLinkQuery = {
  select: {
    id: true,
    isRegistrationFinished: true,
    userRoles: {
      id: true,
      isRegistrationFinished: true,
      invitationLinkCreationDate: true,
      userId: true,
      role: { name: true },
      address: {
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
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true, address: true, profile: true } } as const satisfies FindOptionsRelations<User>,
};
export type TResendRegistrationLink = QueryResultType<User, typeof ResendRegistrationLinkQuery.select>;
