import { Body, Controller, Patch, UseGuards, UsePipes } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { CreateOrUpdateInterpreterBadge } from "src/modules/interpreters/badge/common/dto";

@Controller("interpreter-profile/badge")
export class InterpreterBadgeController {
  constructor(private readonly interpreterBadgeService: InterpreterBadgeService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch()
  async createOrUpdateInterpreterBadge(
    @Body() dto: CreateOrUpdateInterpreterBadge,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.interpreterBadgeService.createOrUpdateInterpreterBadge(dto, user);
  }
}
