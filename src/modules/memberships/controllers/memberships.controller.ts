import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UUIDParamDto } from "src/common/dto";
import {
  MembershipAssignmentsService,
  MembershipsPriceService,
  MembershipsService,
} from "src/modules/memberships/services";
import { UpdateMembershipDto, UpdateMembershipPriceDto } from "src/modules/memberships/common/dto";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { GetUserMembershipsOutput } from "src/modules/memberships/common/outputs";
import { TGetAdminMemberships, TGetSubscriptionStatus } from "src/modules/memberships/common/types";

@Controller("memberships")
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly membershipsPriceService: MembershipsPriceService,
  ) {}

  @Get("admin")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAdminMemberships(): Promise<TGetAdminMemberships[]> {
    return await this.membershipsService.getAdminMemberships();
  }

  @Get("user")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getUserMemberships(@CurrentUser() user: ITokenUserData): Promise<GetUserMembershipsOutput[]> {
    return await this.membershipsService.getUserMemberships(user);
  }

  @Get("status")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getSubscriptionStatus(@CurrentUser() user: ITokenUserData): Promise<TGetSubscriptionStatus | null> {
    return await this.membershipAssignmentsService.getSubscriptionStatus(user);
  }

  @Post("subscription/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async processMembershipSubscription(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.membershipsService.processMembershipSubscription(id, user);
  }

  @Post("subscription-cancel")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async processCancelMembershipSubscription(@CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.membershipsService.processCancelMembershipSubscription(user);
  }

  @Patch(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  async updateMembership(@Param() { id }: UUIDParamDto, @Body() dto: UpdateMembershipDto): Promise<void> {
    return await this.membershipsService.updateMembership(id, dto);
  }

  @Patch("activate/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async activateMembership(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.membershipsService.activateMembership(id);
  }

  @Patch("deactivate/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async deactivateMembership(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.membershipsService.deactivateMembership(id);
  }

  @Patch("prices/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateMembershipPrice(@Param() { id }: UUIDParamDto, @Body() dto: UpdateMembershipPriceDto): Promise<void> {
    return await this.membershipsPriceService.updateMembershipPrice(id, dto);
  }
}
