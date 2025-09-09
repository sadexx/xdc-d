import { Injectable } from "@nestjs/common";
import { FindManyOptions, FindOneOptions, Not } from "typeorm";
import { Membership, MembershipAssignment, MembershipPrice } from "src/modules/memberships/entities";
import { ESortOrder } from "src/common/enums";
import {
  ActivateMembershipQuery,
  CancelMembershipSubscriptionUserRoleQuery,
  ConstructAndCreateMembershipAssignmentQuery,
  DeactivateMembershipQuery,
  DeductFreeMinutesQuery,
  GetAdminMembershipsQuery,
  GetSubscriptionStatusQuery,
  GetUserMembershipsQuery,
  GetUserMembershipsUserRoleQuery,
  ProcessMembershipAssignmentMembershipQuery,
  ProcessMembershipAssignmentQuery,
  ProcessMembershipPaymentQuery,
  ProcessMembershipPaymentUserRoleQuery,
  ProcessMembershipSubscriptionQuery,
  ProcessMembershipSubscriptionUserRoleQuery,
  UpdateExistingMembershipSubscriptionsQuery,
  UpdateMembershipPriceQuery,
} from "src/modules/memberships/common/types";
import { UserRole } from "src/modules/users/entities";
import { EMembershipStatus } from "src/modules/memberships/common/enums";

@Injectable()
export class MembershipsQueryOptionsService {
  /**
   ** MembershipsService
   */

  public getAdminMembershipsOptions(): FindManyOptions<Membership> {
    return {
      select: GetAdminMembershipsQuery.select,
      relations: GetAdminMembershipsQuery.relations,
      order: { type: ESortOrder.ASC },
    };
  }

  public getUserMembershipsOptions(userRoleId: string): {
    memberships: FindManyOptions<Membership>;
    userRole: FindOneOptions<UserRole>;
  } {
    return {
      memberships: {
        select: GetUserMembershipsQuery.select,
        where: { status: Not(EMembershipStatus.DEACTIVATED) },
        relations: GetUserMembershipsQuery.relations,
        order: { type: ESortOrder.ASC },
      },
      userRole: {
        select: GetUserMembershipsUserRoleQuery.select,
        where: { id: userRoleId },
      },
    };
  }

  public processMembershipSubscriptionOptions(
    id: string,
    userRoleId: string,
  ): { membership: FindOneOptions<Membership>; userRole: FindOneOptions<UserRole> } {
    return {
      membership: {
        select: ProcessMembershipSubscriptionQuery.select,
        where: { id },
        relations: ProcessMembershipSubscriptionQuery.relations,
      },
      userRole: {
        select: ProcessMembershipSubscriptionUserRoleQuery.select,
        where: { id: userRoleId },
        relations: ProcessMembershipSubscriptionUserRoleQuery.relations,
      },
    };
  }

  public cancelMembershipSubscriptionOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: CancelMembershipSubscriptionUserRoleQuery.select,
      where: { id: userRoleId },
      relations: CancelMembershipSubscriptionUserRoleQuery.relations,
    };
  }

  public activateMembershipOptions(id: string): FindOneOptions<Membership> {
    return {
      select: ActivateMembershipQuery.select,
      where: { id },
      relations: ActivateMembershipQuery.relations,
    };
  }

  public deactivateMembershipOptions(id: string): FindOneOptions<Membership> {
    return {
      select: DeactivateMembershipQuery.select,
      where: { id },
      relations: DeactivateMembershipQuery.relations,
    };
  }

  /**
   ** MembershipsPriceService
   */

  public updateMembershipPriceOptions(membershipPriceId: string): FindOneOptions<MembershipPrice> {
    return {
      select: UpdateMembershipPriceQuery.select,
      where: { id: membershipPriceId },
      relations: UpdateMembershipPriceQuery.relations,
    };
  }

  public updateExistingMembershipSubscriptionsOptions(id: string): FindOneOptions<Membership> {
    return {
      select: UpdateExistingMembershipSubscriptionsQuery.select,
      where: { id },
      relations: UpdateExistingMembershipSubscriptionsQuery.relations,
    };
  }

  /**
   ** MembershipPaymentsService
   */

  public processMembershipPaymentOptions(
    id: string,
    userRoleId: string,
  ): {
    membership: FindOneOptions<Membership>;
    userRole: FindOneOptions<UserRole>;
  } {
    return {
      membership: {
        select: ProcessMembershipPaymentQuery.select,
        where: { id },
        relations: ProcessMembershipPaymentQuery.relations,
      },
      userRole: {
        select: ProcessMembershipPaymentUserRoleQuery.select,
        where: { id: userRoleId },
        relations: ProcessMembershipPaymentUserRoleQuery.relations,
      },
    };
  }

  /**
   ** MembershipAssignmentsService
   */

  public getSubscriptionStatusOptions(userRoleId: string): FindOneOptions<MembershipAssignment> {
    return {
      select: GetSubscriptionStatusQuery.select,
      where: { discountHolder: { userRole: { id: userRoleId } } },
      relations: GetSubscriptionStatusQuery.relations,
    };
  }

  public processMembershipAssignmentOptions(
    id: string,
    userRoleId: string,
  ): {
    membership: FindOneOptions<Membership>;
    membershipAssignment: FindOneOptions<MembershipAssignment>;
  } {
    return {
      membership: {
        select: ProcessMembershipAssignmentMembershipQuery.select,
        where: { id },
      },
      membershipAssignment: {
        select: ProcessMembershipAssignmentQuery.select,
        where: { discountHolder: { userRole: { id: userRoleId } } },
        relations: ProcessMembershipAssignmentQuery.relations,
      },
    };
  }

  public constructAndCreateMembershipAssignmentOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: ConstructAndCreateMembershipAssignmentQuery.select,
      where: { id: userRoleId },
    };
  }

  /**
   ** MembershipsUsageService
   */

  public deductFreeMinutesOptions(userRoleId: string): FindOneOptions<MembershipAssignment> {
    return {
      select: DeductFreeMinutesQuery.select,
      where: { discountHolder: { userRole: { id: userRoleId } } },
      relations: DeductFreeMinutesQuery.relations,
    };
  }
}
