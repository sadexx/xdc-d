import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { DocusignCorporateService } from "src/modules/docusign/services";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import {
  CorporateContractDto,
  FillCorporateSignersDto,
  GetCorporateSignersDto,
  RemoveSecondCorporateSignerDto,
  SendContractDto,
} from "src/modules/docusign/common/dto";
import { CorporateContractSigners } from "src/modules/docusign/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ICreateContractOutput, ISendContractOutput } from "src/modules/docusign/common/outputs";

@Controller("docusign/corporate")
export class DocusignCorporateController {
  constructor(private readonly docusignCorporateService: DocusignCorporateService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("fill-corporate-signers")
  async fillCorporateSigners(@Body() dto: FillCorporateSignersDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.docusignCorporateService.fillCorporateSigners(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-second-corporate-signer")
  async removeSecondCorporateSigner(
    @Body() dto: RemoveSecondCorporateSignerDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.docusignCorporateService.removeSecondCorporateSigner(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("get-corporate-signers")
  async getCorporateSigners(
    @Query() dto: GetCorporateSignersDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CorporateContractSigners | null> {
    return await this.docusignCorporateService.getCorporateSigners(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-and-send-corporate-contract")
  async createAndSendCorporateContract(
    @Body() { companyId }: CorporateContractDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<ISendContractOutput> {
    return this.docusignCorporateService.createAndSendCorporateContract(companyId, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-corporate-contract")
  async createCorporateContract(
    @Body() { companyId }: CorporateContractDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<ICreateContractOutput> {
    return this.docusignCorporateService.createCorporateContract(companyId, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("send-corporate-contract")
  async sendCorporateContract(@Body() { id }: SendContractDto): Promise<ISendContractOutput> {
    return this.docusignCorporateService.fillAndSendCorporateContract(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("resend-contract")
  async resendContract(@Body() { id }: SendContractDto): Promise<void> {
    return this.docusignCorporateService.resendContract(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("get-contract-edit-link")
  async getContractEditLink(@Query() { id }: SendContractDto): Promise<ICreateContractOutput> {
    return this.docusignCorporateService.getEditLink(id);
  }
}
