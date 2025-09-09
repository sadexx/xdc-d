import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { SettingsService } from "src/modules/settings/services";
import { Setting } from "src/modules/settings/entities";
import { UpdateSettingDto } from "src/modules/settings/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { IMessageOutput } from "src/common/outputs";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get()
  public async findAll(): Promise<Omit<Setting, "id">> {
    return this.settingsService.getSettings();
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch()
  public async update(@Body() dto: UpdateSettingDto): Promise<IMessageOutput> {
    return this.settingsService.updateSetting(dto);
  }
}
