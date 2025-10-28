import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import {
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  JwtRestorationGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { RemovalRequestService, RemovalRestorationService } from "src/modules/removal/services";
import { UUIDParamDto } from "src/common/dto";
import { RemoveCompanyDto, RestoreUserDto } from "src/modules/removal/common/dto";

@Controller("removal")
export class RemovalController {
  constructor(
    private readonly removalRequestService: RemovalRequestService,
    private readonly removalRestorationService: RemovalRestorationService,
  ) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("user/:id")
  public async removeUserRequest(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.removalRequestService.removeUserRequest(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("role/:id")
  public async removeUserRoleRequest(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.removalRequestService.removeUserRoleRequest(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("company")
  public async deleteCompanyRequest(
    @Query() dto: RemoveCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.removalRequestService.removeCompanyRequest(dto, user);
  }

  @UseGuards(JwtRestorationGuard)
  @Post("restore/user")
  public async restoreUserByRestorationKey(@Body() { restorationKey }: RestoreUserDto): Promise<void> {
    return await this.removalRestorationService.restoreByRestorationKey(restorationKey);
  }

  @UseGuards(JwtRestorationGuard)
  @Post("restore/company")
  public async restoreCompany(@CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.removalRestorationService.restoreCompany(user);
  }
}
