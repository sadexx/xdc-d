import { Body, Controller, Get, HttpStatus, Post, Query, Redirect, UseGuards, UsePipes } from "@nestjs/common";
import { OldGeneralPaymentsService } from "src/modules/payments/services";
import { OldDownloadReceiptDto } from "src/modules/payments/common/dto";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OldMakeManualPayoutAttemptDto } from "src/modules/payments/common/dto/old-make-manual-payout-attempt.dto";
import { OldGetIndividualPaymentsDto } from "src/modules/payments/common/dto/old-get-individual-payments.dto";
import { OrderLimitPipe } from "src/common/pipes";
import { OldIDownloadReceiptOutput, OldIGetIndividualPaymentResponseOutput } from "src/modules/payments/common/outputs";

@Controller("payments")
export class OldPaymentsController {
  constructor(private readonly generalPaymentsService: OldGeneralPaymentsService) {}

  @Get("download-receipt")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async downloadReceipt(@Query() dto: OldDownloadReceiptDto): Promise<OldIDownloadReceiptOutput> {
    const receiptLink = await this.generalPaymentsService.downloadReceipt(dto);

    return { url: receiptLink };
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Get("download-receipt-by-user")
  async downloadReceiptByUser(@Query() dto: OldDownloadReceiptDto): Promise<OldIDownloadReceiptOutput> {
    const receiptLink = await this.generalPaymentsService.downloadReceipt(dto);

    return { url: receiptLink };
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("manual-payout-attempt")
  async makeManualPayInCaptureAndPayOut(@Body() dto: OldMakeManualPayoutAttemptDto): Promise<void> {
    return await this.generalPaymentsService.makeManualPayInCaptureAndPayOut(dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("get-payments-list")
  async getIndividualPaymentsList(
    @Query() dto: OldGetIndividualPaymentsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<OldIGetIndividualPaymentResponseOutput> {
    return await this.generalPaymentsService.getIndividualPaymentsList(dto, user);
  }
}
