import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { PermissionsService } from "src/modules/permissions/services";
import {
  EditOnePermissionDto,
  EditPermissionsByModuleDto,
  GetPermissionsByRoleDto,
} from "src/modules/permissions/common/dto";
import { IGetPermissionsOutput } from "src/modules/permissions/common/outputs";

@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get()
  async getPermissions(@Query() { userRole }: GetPermissionsByRoleDto): Promise<IGetPermissionsOutput> {
    return this.permissionsService.getPermissions(userRole);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("edit-one")
  async editOnePermission(@Body() dto: EditOnePermissionDto): Promise<void> {
    return this.permissionsService.editOnePermission(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("edit-by-module")
  async editPermissionsByModule(@Body() dto: EditPermissionsByModuleDto): Promise<void> {
    return this.permissionsService.editPermissionsByModule(dto);
  }
}
