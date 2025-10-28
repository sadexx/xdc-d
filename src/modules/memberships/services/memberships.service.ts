import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { Not, Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { membershipsSeedData } from "src/modules/memberships/common/seed-data";
import {
  EMembershipErrorCodes,
  EMembershipNotificationType,
  EMembershipPricingRegion,
  EMembershipStatus,
} from "src/modules/memberships/common/enums";
import { findManyTyped, findOneOrFailTyped } from "src/common/utils";
import { EmailsService } from "src/modules/emails/services";
import { UpdateMembershipDto } from "src/modules/memberships/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ConfigService } from "@nestjs/config";
import {
  MembershipAssignmentsService,
  MembershipPaymentsService,
  MembershipsPriceService,
  MembershipsQueryOptionsService,
} from "src/modules/memberships/services";
import { UserRole } from "src/modules/users/entities";
import { QueueInitializeService } from "src/modules/queues/services";
import {
  TActivateMembership,
  TCancelMembershipSubscriptionUserRole,
  TDeactivateMembership,
  TGetAdminMemberships,
  TGetUserMemberships,
  TGetUserMembershipsUserRole,
  TProcessMembershipSubscription,
  TProcessMembershipSubscriptionUserRole,
  TProcessNotifyMembershipChanges,
  TProcessNotifyMembershipChangesMembershipAssignment,
} from "src/modules/memberships/common/types";
import { GetUserMembershipsOutput } from "src/modules/memberships/common/outputs";

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly membershipsQueryOptionsService: MembershipsQueryOptionsService,
    private readonly membershipsPriceService: MembershipsPriceService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly membershipPaymentsService: MembershipPaymentsService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async seedMembershipsToDatabase(): Promise<void> {
    const membershipsCount = await this.membershipRepository.count();

    if (membershipsCount === 0) {
      const seedData = membershipsSeedData(this.configService);
      await this.membershipRepository.save(seedData);
    }
  }

  public async getAdminMemberships(): Promise<TGetAdminMemberships[]> {
    const queryOptions = this.membershipsQueryOptionsService.getAdminMembershipsOptions();
    const memberships = await findManyTyped<TGetAdminMemberships[]>(this.membershipRepository, queryOptions);

    return memberships;
  }

  public async getUserMemberships(user: ITokenUserData): Promise<GetUserMembershipsOutput[]> {
    const queryOptions = this.membershipsQueryOptionsService.getUserMembershipsOptions(user.userRoleId);

    const memberships = await findManyTyped<TGetUserMemberships[]>(this.membershipRepository, queryOptions.memberships);
    const userRole = await findOneOrFailTyped<TGetUserMembershipsUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    return plainToInstance(
      GetUserMembershipsOutput,
      memberships.map((membership) => {
        const { price, currency } = this.membershipsPriceService.getMembershipPrice(membership, userRole);

        return { ...membership, price, currency };
      }),
    );
  }

  public async processMembershipSubscription(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.membershipsQueryOptionsService.processMembershipSubscriptionOptions(id, user.userRoleId);

    const membership = await findOneOrFailTyped<TProcessMembershipSubscription>(
      id,
      this.membershipRepository,
      queryOptions.membership,
    );
    const userRole = await findOneOrFailTyped<TProcessMembershipSubscriptionUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    await this.membershipPaymentsService.createStripeSubscription(membership, userRole);
    await this.membershipAssignmentsService.processMembershipAssignment(membership.id, userRole.id);
  }

  public async processCancelMembershipSubscription(user: ITokenUserData): Promise<void> {
    const queryOptions = this.membershipsQueryOptionsService.cancelMembershipSubscriptionOptions(user.userRoleId);
    const userRole = await findOneOrFailTyped<TCancelMembershipSubscriptionUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    await this.membershipPaymentsService.cancelStripeSubscription(userRole);

    if (userRole.discountHolder && userRole.discountHolder.membershipAssignment) {
      const { membershipAssignment } = userRole.discountHolder;
      await this.membershipAssignmentRepository.update(membershipAssignment.id, {
        nextMembership: null,
      });
    }
  }

  public async updateMembership(id: string, dto: UpdateMembershipDto): Promise<void> {
    if (dto.isMostPopular === true) {
      await this.membershipRepository.update({ id: Not(id) }, { isMostPopular: false });
    }

    await this.membershipRepository.update(id, dto);
  }

  public async activateMembership(id: string): Promise<void> {
    const queryOptions = this.membershipsQueryOptionsService.activateMembershipOptions(id);
    const membership = await findOneOrFailTyped<TActivateMembership>(id, this.membershipRepository, queryOptions);

    await this.membershipPaymentsService.activateSubscriptionProduct(membership);
    await this.membershipRepository.update(id, { status: EMembershipStatus.ACTIVE });
  }

  public async deactivateMembership(id: string): Promise<void> {
    const queryOptions = this.membershipsQueryOptionsService.deactivateMembershipOptions(id);
    const membership = await findOneOrFailTyped<TDeactivateMembership>(id, this.membershipRepository, queryOptions);

    if (membership.status === EMembershipStatus.DEACTIVATED) {
      throw new BadRequestException(EMembershipErrorCodes.DEACTIVATION_ALREADY_DEACTIVATED);
    }

    await this.membershipPaymentsService.deactivateSubscriptionProduct(membership);
    await this.membershipRepository.update(id, { status: EMembershipStatus.DEACTIVATED });

    if (membership.currentMemberships && membership.currentMemberships.length > 0) {
      await this.membershipAssignmentsService.deactivateNextMemberships(membership);
    }

    await this.queueInitializeService.addNotifyUsersAboutMembershipChangesQueue(
      membership,
      EMembershipNotificationType.DEACTIVATION,
    );
  }

  public async processNotifyMembershipChanges(
    membership: TProcessNotifyMembershipChanges,
    membershipAssignment: TProcessNotifyMembershipChangesMembershipAssignment,
    notificationType: EMembershipNotificationType,
    membershipPricingRegion?: EMembershipPricingRegion,
  ): Promise<void> {
    const { userRole } = membershipAssignment.discountHolder;

    if (!userRole || !membershipAssignment.endDate) {
      return;
    }

    if (notificationType === EMembershipNotificationType.PRICE_UPDATE) {
      const pricingRegion = this.membershipsPriceService.getMembershipPricingRegion(userRole.country);

      if (pricingRegion !== membershipPricingRegion) {
        return;
      }

      const membershipPrice = this.membershipsPriceService.getMembershipPrice(membership, userRole);
      await this.emailsService.sendMembershipPriceUpdateEmail(
        userRole.profile.contactEmail,
        userRole.profile.preferredName || userRole.profile.firstName,
        membershipPrice.price,
        membership.type,
        membershipAssignment.endDate,
      );
    } else if (notificationType === EMembershipNotificationType.DEACTIVATION) {
      await this.emailsService.sendMembershipDeactivationEmail(
        userRole.profile.contactEmail,
        userRole.profile.preferredName || userRole.profile.firstName,
        membershipAssignment.endDate,
        membership.type,
      );
    }
  }
}
