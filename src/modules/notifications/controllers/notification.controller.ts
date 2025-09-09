import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from "@nestjs/common";
import { NotificationService } from "src/modules/notifications/services";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { GetAllNotificationsDto } from "src/modules/notifications/common/dto";
import { GetAllNotificationsOutput } from "src/modules/notifications/common/outputs";
import { UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  async getAllNotifications(
    @Query() dto: GetAllNotificationsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetAllNotificationsOutput> {
    return this.notificationService.getAll(user.userRoleId, dto);
  }

  @Delete("/:id")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.notificationService.deleteById(id, user.userRoleId);
  }
}
