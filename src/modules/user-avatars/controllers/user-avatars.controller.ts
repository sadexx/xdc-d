import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { UUIDParamDto } from "src/common/dto";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { UserAvatarsManualDecisionDto } from "src/modules/user-avatars/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { IFile } from "src/modules/file-management/common/interfaces";
import { TGetAvatarRequestByUserId } from "src/modules/user-avatars/common/types";

@Controller("user-avatars")
export class UserAvatarsController {
  constructor(private readonly userAvatarsService: UserAvatarsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get(":id")
  async getAvatarRequestByUserId(@Param() { id }: UUIDParamDto): Promise<TGetAvatarRequestByUserId> {
    return await this.userAvatarsService.getAvatarRequestByUserId(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload")
  async uploadAvatar(@UploadedFile() file: IFile, @CurrentUser() user: ITokenUserData): Promise<IMessageOutput> {
    return await this.userAvatarsService.uploadAvatar(user, file);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("manual-decision")
  async rightToWorkCheckManualDecision(@Body() dto: UserAvatarsManualDecisionDto): Promise<void> {
    return await this.userAvatarsService.userAvatarManualDecision(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Delete("remove")
  async removeAvatar(@CurrentUser() user: ITokenUserData): Promise<IMessageOutput> {
    return await this.userAvatarsService.removeAvatar(user);
  }
}
