import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { AuthRegistrationLinkService } from "src/modules/auth/services";
import { ResendRegistrationLinkDto, SendRegistrationLinkDto } from "src/modules/auth/common/dto";
import { RegistrationLinkOutput } from "src/modules/auth/common/outputs";
import { UUIDParamDto } from "src/common/dto";

@Controller("registration-link")
export class AuthRegistrationLinkController {
  constructor(private readonly authRegistrationLinkService: AuthRegistrationLinkService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post()
  async sendRegistrationLink(@Body() dto: SendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    return await this.authRegistrationLinkService.sendRegistrationLink(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("resend")
  async resendRegistrationLink(@Body() dto: ResendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    return await this.authRegistrationLinkService.resendRegistrationLink(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("delete-by-id/:id")
  public async deleteById(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.authRegistrationLinkService.deleteRegistrationLinkById(id);
  }
}
