import { Body, Controller, Get, Patch, Post, SerializeOptions, UseGuards, UsePipes } from "@nestjs/common";
import { UserProfilesService } from "src/modules/users/services";
import { CurrentUser } from "src/common/decorators";
import { CreateUserProfileDto, UpdateUserProfileDto } from "src/modules/users/common/dto";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { JwtRequiredInfoOrActivationOrFullAccessGuard } from "src/modules/auth/common/guards";
import { CreateUserProfileOutput, UserProfileOutput } from "src/modules/users/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("users")
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @SerializeOptions({ strategy: "exposeAll", type: UserProfileOutput })
  @Get("/profile-information")
  async findUserProfile(@CurrentUser() user: ITokenUserData): Promise<UserProfileOutput> {
    return await this.userProfilesService.findUserProfile(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @UsePipes(NotEmptyBodyPipe)
  @SerializeOptions({ strategy: "exposeAll", type: UserProfileOutput })
  @Post("/profile-information")
  async createUserProfileInformation(
    @Body() dto: CreateUserProfileDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CreateUserProfileOutput> {
    return await this.userProfilesService.createUserProfileInformation(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch("/profile-information")
  async editUserProfile(@Body() dto: UpdateUserProfileDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.userProfilesService.updateUserProfileInformation(dto, user);
  }
}
