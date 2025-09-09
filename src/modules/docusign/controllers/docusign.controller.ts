import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { DocusignService } from "src/modules/docusign/services";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import {
  DownloadContractDto,
  GetContractsDto,
  GetEnvelopeDocumentDto,
  SendContractDto,
} from "src/modules/docusign/common/dto";
import { DocusignContract } from "src/modules/docusign/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IDownloadContractOutput, IGetLinkToDocumentOutput } from "src/modules/docusign/common/outputs";

@Controller("docusign")
export class DocusignController {
  constructor(private readonly docusignService: DocusignService) {}

  @Get("callback")
  async callback(): Promise<string> {
    return this.docusignService.callback();
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("download-contract")
  async downloadContract(
    @Query() dto: DownloadContractDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IDownloadContractOutput> {
    return this.docusignService.downloadContract(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("envelope-document")
  async getContractDocument(@Query() { id }: GetEnvelopeDocumentDto): Promise<IGetLinkToDocumentOutput> {
    return this.docusignService.getLinkToDocument(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("resend-contract")
  async resendContract(@Body() dto: SendContractDto): Promise<void> {
    return this.docusignService.resendContract(dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("contracts")
  async getContractList(
    @Query() getContractsDto: GetContractsDto,
    @CurrentUser() currentUser: ITokenUserData,
  ): Promise<DocusignContract[]> {
    return this.docusignService.getContractList(getContractsDto, currentUser);
  }
}
