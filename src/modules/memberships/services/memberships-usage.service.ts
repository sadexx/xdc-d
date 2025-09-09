import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { findOneOrFailTyped } from "src/common/utils";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";
import { TLiveAppointmentCache } from "src/modules/appointments/appointment/common/types";
import {
  TApplyAppointmentFreeMinutes,
  TDeductFreeMinutes,
  TFetchMembershipDiscount,
  TAdjustMembershipFreeMinutesAssignment,
  TAdjustMembershipFreeMinutesAppointment,
} from "src/modules/memberships/common/types";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { IMembershipDiscountData } from "src/modules/memberships/common/interfaces";
import { MembershipsQueryOptionsService } from "src/modules/memberships/services";
import { TApplyDiscountsForAppointmentValidated } from "src/modules/discounts/common/types";

@Injectable()
export class MembershipsUsageService {
  constructor(private readonly membershipsQueryOptionsService: MembershipsQueryOptionsService) {}

  public async fetchAndApplyMembershipDiscount(
    manager: EntityManager,
    membershipAssignment: TFetchMembershipDiscount,
    appointment: TApplyDiscountsForAppointmentValidated,
  ): Promise<IMembershipDiscountData> {
    const availableMinutes = this.calculateFreeMinutesToApply(
      appointment.schedulingDurationMin,
      appointment,
      membershipAssignment,
    );
    await this.applyAppointmentFreeMinutes(manager, membershipAssignment, appointment, availableMinutes);

    return {
      freeMinutes: availableMinutes,
      discount: membershipAssignment.discount,
      membershipType: membershipAssignment.currentMembership.type,
    };
  }

  public async fetchAvailableMembershipDiscountForExtension(
    neededMinutes: number,
    appointment: TApplyDiscountsForAppointmentValidated,
    membershipAssignment: MembershipAssignment,
  ): Promise<IMembershipDiscountData | null> {
    const availableMinutes = this.calculateFreeMinutesToApply(neededMinutes, appointment, membershipAssignment);

    return {
      discount: membershipAssignment.discount,
      freeMinutes: availableMinutes,
      membershipType: membershipAssignment.currentMembership.type,
    };
  }

  private async applyAppointmentFreeMinutes(
    manager: EntityManager,
    membershipAssignment: TAdjustMembershipFreeMinutesAssignment,
    appointment: TApplyAppointmentFreeMinutes,
    freeMinutes: number,
  ): Promise<number | null> {
    if (freeMinutes === 0) {
      return null;
    }

    const minutesToDeduct = -freeMinutes;
    await this.adjustMembershipFreeMinutes(manager, minutesToDeduct, appointment, membershipAssignment);

    return freeMinutes;
  }

  public async deductFreeMinutes(
    manager: EntityManager,
    appointment: TLiveAppointmentCache,
    freeMinutes: number,
  ): Promise<TDeductFreeMinutes | null> {
    if (!appointment.clientId) {
      return null;
    }

    const queryOptions = this.membershipsQueryOptionsService.deductFreeMinutesOptions(appointment.clientId);
    const membershipAssignment = await findOneOrFailTyped<TDeductFreeMinutes>(
      appointment.clientId,
      manager.getRepository(MembershipAssignment),
      queryOptions,
    );

    const minutesToDeduct = -freeMinutes;
    await this.adjustMembershipFreeMinutes(manager, minutesToDeduct, appointment, membershipAssignment);

    return membershipAssignment;
  }

  private calculateFreeMinutesToApply(
    requiredMinutes: number,
    appointment: TAdjustMembershipFreeMinutesAppointment,
    membershipAssignment: TAdjustMembershipFreeMinutesAssignment,
  ): number {
    const availableMinutes = this.getAvailableMinutesForAppointment(appointment, membershipAssignment);

    return Math.min(requiredMinutes, availableMinutes);
  }

  private getAvailableMinutesForAppointment(
    appointment: TAdjustMembershipFreeMinutesAppointment,
    membershipAssignment: TAdjustMembershipFreeMinutesAssignment,
  ): number {
    const isOnDemand = appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND;

    return isOnDemand ? membershipAssignment.onDemandMinutes : membershipAssignment.preBookedMinutes;
  }

  private async adjustMembershipFreeMinutes(
    manager: EntityManager,
    deltaMinutes: number,
    appointment: TAdjustMembershipFreeMinutesAppointment,
    membershipAssignment: TAdjustMembershipFreeMinutesAssignment,
  ): Promise<void> {
    const isOnDemand = appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND;
    const updateData: Partial<MembershipAssignment> = isOnDemand
      ? { onDemandMinutes: membershipAssignment.onDemandMinutes + deltaMinutes }
      : { preBookedMinutes: membershipAssignment.preBookedMinutes + deltaMinutes };
    await manager.getRepository(MembershipAssignment).update(membershipAssignment.id, updateData);
  }
}
