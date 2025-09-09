import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { BlacklistService } from "src/modules/blacklists/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { CreateBlacklistDto, UpdateBlacklistDto } from "src/modules/blacklists/common/dto";
import { IMessageOutput } from "src/common/outputs";

@Controller("blacklists")
export class BlacklistsController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post(":id")
  async createBlacklist(
    @Param() { id }: UUIDParamDto,
    @Body() dto: CreateBlacklistDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput | void> {
    return await this.blacklistService.checkAndCreateBlacklist(id, dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch(":id")
  async updateBlacklist(
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateBlacklistDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.blacklistService.updateBlacklist(id, dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id")
  async deleteBlacklist(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.blacklistService.deleteBlacklist(id, user);
  }
}
