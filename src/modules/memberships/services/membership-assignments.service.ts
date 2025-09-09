import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { In, IsNull, LessThanOrEqual, Repository } from "typeorm";
import { DiscountHoldersService } from "src/modules/discounts/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import { ICreateMembershipAssignment } from "src/modules/memberships/common/interfaces";
import { isWithinInterval } from "date-fns";
import {
  EMembershipAssignmentStatus,
  EMembershipStatus,
  membershipTypeOrder,
} from "src/modules/memberships/common/enums";
import { UserRole } from "src/modules/users/entities";
import { LokiLogger } from "src/common/logger";
import {
  TConstructAndCreateMembershipAssignment,
  TConstructMembershipAssignmentDto,
  TDeactivateMembership,
  TGetSubscriptionStatus,
  TProcessMembershipAssignment,
  TProcessMembershipAssignmentMembership,
  TValidateMembershipAssignmentAvailabilityAppointment,
  TValidateMembershipAssignmentAvailabilityAssignment,
} from "src/modules/memberships/common/types";
import { MembershipsQueryOptionsService } from "src/modules/memberships/services";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
} from "src/modules/appointments/appointment/common/enums";

@Injectable()
export class MembershipAssignmentsService {
  private readonly lokiLogger = new LokiLogger(MembershipAssignmentsService.name);
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly discountHoldersService: DiscountHoldersService,
    private readonly membershipsQueryOptionsService: MembershipsQueryOptionsService,
  ) {}

  public async getSubscriptionStatus(user: ITokenUserData): Promise<TGetSubscriptionStatus | null> {
    const queryOptions = this.membershipsQueryOptionsService.getSubscriptionStatusOptions(user.userRoleId);
    const membershipAssignment = await findOneTyped<TGetSubscriptionStatus>(
      this.membershipAssignmentRepository,
      queryOptions,
    );

    return membershipAssignment ?? null;
  }

  public async processMembershipAssignment(
    membershipId: string,
    userRoleId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<void> {
    const queryOptions = this.membershipsQueryOptionsService.processMembershipAssignmentOptions(
      membershipId,
      userRoleId,
    );

    const membership = await findOneOrFailTyped<TProcessMembershipAssignmentMembership>(
      membershipId,
      this.membershipRepository,
      queryOptions.membership,
    );
    const existingMembershipAssignment = await findOneTyped<TProcessMembershipAssignment>(
      this.membershipAssignmentRepository,
      queryOptions.membershipAssignment,
    );

    if (existingMembershipAssignment) {
      await this.updateMembershipAssignment(membership, existingMembershipAssignment, startDate, endDate);
    } else {
      await this.constructAndCreateMembershipAssignment(membership, userRoleId, startDate, endDate);
    }
  }

  private async updateMembershipAssignment(
    newMembership: TProcessMembershipAssignmentMembership,
    existingMembershipAssignment: TProcessMembershipAssignment,
    startDate?: Date,
    endDate?: Date,
  ): Promise<void> {
    const newMembershipRank = membershipTypeOrder[newMembership.type];
    const currentMembershipRank = membershipTypeOrder[existingMembershipAssignment.currentMembership.type];

    if (startDate && endDate) {
      await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, {
        startDate,
        endDate,
      });

      return;
    }

    const membershipAssignmentDto = await this.constructMembershipAssignmentDto(newMembership, startDate, endDate);

    if (
      existingMembershipAssignment.status !== EMembershipAssignmentStatus.ACTIVE ||
      newMembershipRank === currentMembershipRank
    ) {
      await this.renewMembershipAssignment(existingMembershipAssignment, membershipAssignmentDto);
    } else if (newMembershipRank > currentMembershipRank) {
      await this.upgradeMembershipAssignment(newMembership, existingMembershipAssignment, membershipAssignmentDto);
    } else if (newMembershipRank < currentMembershipRank) {
      await this.downgradeMembershipAssignment(newMembership, existingMembershipAssignment);
    }
  }

  private async renewMembershipAssignment(
    existingMembershipAssignment: TProcessMembershipAssignment,
    dto: ICreateMembershipAssignment,
  ): Promise<void> {
    await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, dto);
  }

  private async upgradeMembershipAssignment(
    newMembership: TProcessMembershipAssignmentMembership,
    existingMembershipAssignment: TProcessMembershipAssignment,
    dto: ICreateMembershipAssignment,
  ): Promise<void> {
    const determinedOnDemandMinutes = existingMembershipAssignment.onDemandMinutes + newMembership.onDemandMinutes;
    const determinedPreBookedMinutes = existingMembershipAssignment.preBookedMinutes + newMembership.preBookedMinutes;

    await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, {
      ...dto,
      onDemandMinutes: determinedOnDemandMinutes,
      preBookedMinutes: determinedPreBookedMinutes,
    });
  }

  private async downgradeMembershipAssignment(
    newMembership: TProcessMembershipAssignmentMembership,
    existingMembershipAssignment: TProcessMembershipAssignment,
  ): Promise<void> {
    await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, {
      nextMembership: newMembership,
    });
  }

  private async constructAndCreateMembershipAssignment(
    membership: TProcessMembershipAssignmentMembership,
    userRoleId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MembershipAssignment> {
    const createMembershipAssignment = await this.constructMembershipAssignmentDto(membership, startDate, endDate);
    const savedMembershipAssignment = await this.createMembershipAssignment(createMembershipAssignment);

    const queryOptions = this.membershipsQueryOptionsService.constructAndCreateMembershipAssignmentOptions(userRoleId);
    const userRole = await findOneOrFailTyped<TConstructAndCreateMembershipAssignment>(
      userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    await this.discountHoldersService.createOrUpdateDiscountHolder(userRole, savedMembershipAssignment);

    return savedMembershipAssignment;
  }

  private async createMembershipAssignment(dto: ICreateMembershipAssignment): Promise<MembershipAssignment> {
    const newMembershipAssignment = this.membershipAssignmentRepository.create(dto);
    const savedMembershipAssignment = await this.membershipAssignmentRepository.save(newMembershipAssignment);

    return savedMembershipAssignment;
  }

  private async constructMembershipAssignmentDto(
    membership: TConstructMembershipAssignmentDto,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ICreateMembershipAssignment> {
    return {
      status: EMembershipAssignmentStatus.ACTIVE,
      discount: membership.discount,
      onDemandMinutes: membership.onDemandMinutes,
      preBookedMinutes: membership.preBookedMinutes,
      currentMembership: membership as Membership,
      nextMembership: membership as Membership,
      startDate,
      endDate,
    };
  }

  public async deactivateExpiredMemberships(): Promise<void> {
    const result = await this.membershipAssignmentRepository.update(
      {
        status: EMembershipAssignmentStatus.ACTIVE,
        nextMembership: IsNull(),
        endDate: LessThanOrEqual(new Date()),
      },
      { status: EMembershipAssignmentStatus.DEACTIVATED },
    );

    if (result.affected) {
      this.lokiLogger.log(`Deactivated ${result.affected} expired memberships`);
    }
  }

  public async deactivateNextMemberships(membership: TDeactivateMembership): Promise<void> {
    const membershipAssignmentIds = membership.currentMemberships.map((assignment) => assignment.id);
    await this.membershipAssignmentRepository.update({ id: In(membershipAssignmentIds) }, { nextMembership: null });
  }

  public validateMembershipAssignmentAvailability(
    membershipAssignment: TValidateMembershipAssignmentAvailabilityAssignment,
    appointment: TValidateMembershipAssignmentAvailabilityAppointment,
  ): boolean {
    if (!membershipAssignment.startDate || !membershipAssignment.endDate) {
      return false;
    }

    const statusesValidStep =
      membershipAssignment.status === EMembershipAssignmentStatus.ACTIVE &&
      membershipAssignment.currentMembership.status === EMembershipStatus.ACTIVE;

    const isAppointmentWithinMembershipInterval = isWithinInterval(appointment.scheduledStartTime, {
      start: membershipAssignment.startDate,
      end: membershipAssignment.endDate,
    });

    const appointmentServicesValidStep =
      appointment.interpretingType === EAppointmentInterpretingType.CONSECUTIVE &&
      appointment.communicationType !== EAppointmentCommunicationType.FACE_TO_FACE;

    return statusesValidStep && isAppointmentWithinMembershipInterval && appointmentServicesValidStep;
  }
}
