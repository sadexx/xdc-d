import { Body, Controller, Param, Patch, UseGuards, UsePipes } from "@nestjs/common";
import { UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { AddressesService } from "src/modules/addresses/services";
import { UpdateAddressDto } from "src/modules/addresses/common/dto";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("addresses")
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Patch("appointment/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  async updateAppointmentAddressById(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
    @Body() dto: UpdateAddressDto,
  ): Promise<void> {
    return await this.addressesService.updateAppointmentAddressById(id, user, dto);
  }
}
