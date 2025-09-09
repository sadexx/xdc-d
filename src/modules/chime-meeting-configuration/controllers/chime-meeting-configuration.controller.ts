import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  AdminUpdateAttendeeCapabilitiesDto,
  AppointmentIdParamDto,
  BaseGetChimeMeetingParamDto,
  UpdateAttendeeCapabilitiesDto,
  CreateCallRequestDto,
  ChimeMediaRegionQueryDto,
  GetChimeMeetingExternalUserDto,
  GetChimeMeetingParamDto,
  UpdateAttendeeStatusParamDto,
  CreateBackgroundCallDto,
} from "src/modules/chime-meeting-configuration/common/dto";
import {
  AttendeeManagementService,
  MeetingClosingService,
  MeetingJoinService,
  SipMediaService,
} from "src/modules/chime-meeting-configuration/services";
import { CurrentUser } from "src/common/decorators";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { IAttendeeDetailsOutput, IJoinMeetingOutput } from "src/modules/chime-meeting-configuration/common/outputs";
import { TMeetingConfigAndAttendees } from "src/modules/chime-meeting-configuration/common/types";

@Controller("chime/meetings")
export class ChimeMeetingConfigurationController {
  constructor(
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly meetingJoinService: MeetingJoinService,
    private readonly sipMediaService: SipMediaService,
    private readonly meetingClosingService: MeetingClosingService,
  ) {}

  @Get("/info-config/:appointmentId")
  async getConfigAndAttendeesByAppointmentId(
    @Param() { appointmentId }: AppointmentIdParamDto,
  ): Promise<TMeetingConfigAndAttendees> {
    return await this.attendeeManagementService.getConfigAndAttendeesByAppointmentId(appointmentId);
  }

  @Get("/join-admin/:appointmentId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async joinMeetingAsSuperAdmin(
    @Param() { appointmentId }: AppointmentIdParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IJoinMeetingOutput> {
    return await this.meetingJoinService.joinMeetingAsSuperAdmin(appointmentId, user);
  }

  @Get("/join/:appointmentId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async joinMeetingAsInternalUser(
    @Param() { appointmentId }: AppointmentIdParamDto,
    @Query() { mediaRegion }: ChimeMediaRegionQueryDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IJoinMeetingOutput> {
    return await this.meetingJoinService.joinMeetingAsInternalUser(appointmentId, user, mediaRegion);
  }

  @Get("/join-external/:appointmentId")
  async joinMeetingAsExternalUser(
    @Param() { appointmentId }: AppointmentIdParamDto,
    @Query() { externalUserId, mediaRegion }: GetChimeMeetingExternalUserDto,
  ): Promise<IJoinMeetingOutput> {
    return await this.meetingJoinService.joinMeetingAsExternalUser(appointmentId, externalUserId, mediaRegion);
  }

  @Get(":chimeMeetingId/attendees/:attendeeId")
  async getAttendeeAndDetails(
    @Param() { chimeMeetingId, attendeeId }: GetChimeMeetingParamDto,
  ): Promise<IAttendeeDetailsOutput> {
    return await this.attendeeManagementService.getAttendeeAndDetails(chimeMeetingId, attendeeId);
  }

  @Patch("batch-update-attendees-capabilities/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async batchUpdateAttendeesCapabilities(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: AdminUpdateAttendeeCapabilitiesDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.attendeeManagementService.batchUpdateAttendeeCapabilities(chimeMeetingId, dto, user);
  }

  @Patch("update-attendee-capabilities/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateAttendeeCapabilities(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: UpdateAttendeeCapabilitiesDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.attendeeManagementService.updateAttendeeCapabilities(chimeMeetingId, dto, user);
  }

  @Delete(":chimeMeetingId/attendees/:attendeeId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async disableAttendeeInMeeting(
    @Param() { chimeMeetingId, attendeeId }: GetChimeMeetingParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.attendeeManagementService.disableAttendeeInMeeting(chimeMeetingId, attendeeId, user);
  }

  @Post("add-extra-attendee/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async addExtraAttendee(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<{
    joinUrl: string;
  }> {
    return await this.attendeeManagementService.addExtraAttendeeInLiveMeeting(chimeMeetingId, user);
  }

  @Post("receptionist-call/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async receptionistCall(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: CreateCallRequestDto,
  ): Promise<IMessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallAsReceptionist(chimeMeetingId, dto);
  }

  @Post("background-calls/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createBackgroundCall(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: CreateBackgroundCallDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.sipMediaService.createBackgroundCall(chimeMeetingId, dto, user);
  }

  @Post("clients-call-for-any-external-participants/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async clientsCallForAnyExternalParticipants(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: CreateCallRequestDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallAsClient(chimeMeetingId, dto, user);
  }

  @Post("leave/:id/:attendeeId")
  async leaveMeeting(@Param() { id, attendeeId }: UpdateAttendeeStatusParamDto): Promise<IMessageOutput> {
    return await this.meetingClosingService.leaveMeeting(id, attendeeId);
  }

  @Post("close/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async closeMeeting(@Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto): Promise<IMessageOutput> {
    return await this.meetingClosingService.queueMeetingClosure(chimeMeetingId);
  }
}
