import { Body, Controller, Get, HttpStatus, Post, Query, Redirect, UseGuards, UsePipes } from "@nestjs/common";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OrderLimitPipe } from "src/common/pipes";
import {
  DownloadReceiptDto,
  GetIndividualPaymentsDto,
  MakeManualCaptureAndTransferDto,
} from "src/modules/payments/common/dto";
import { IDownloadReceiptOutput, IGetIndividualPaymentsListOutput } from "src/modules/payments/common/outputs";
import { PaymentsGeneralService } from "src/modules/payments/services";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsGeneralService: PaymentsGeneralService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("get-payments-list")
  async getIndividualPaymentsList(
    @Query() dto: GetIndividualPaymentsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IGetIndividualPaymentsListOutput> {
    return await this.paymentsGeneralService.getIndividualPaymentsList(dto, user);
  }

  @Get("download-receipt")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async downloadReceipt(@Query() dto: DownloadReceiptDto): Promise<IDownloadReceiptOutput> {
    const receiptLink = await this.paymentsGeneralService.downloadReceipt(dto);

    return { url: receiptLink };
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Get("download-receipt-by-user")
  async downloadReceiptByUser(@Query() dto: DownloadReceiptDto): Promise<IDownloadReceiptOutput> {
    const receiptLink = await this.paymentsGeneralService.downloadReceipt(dto);

    return { url: receiptLink };
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("manual-payout-attempt")
  async makeManualPayInCaptureAndPayOut(@Body() dto: MakeManualCaptureAndTransferDto): Promise<void> {
    return await this.paymentsGeneralService.makeManualCaptureAndTransfer(dto);
  }
}
