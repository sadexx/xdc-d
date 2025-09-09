import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import {
  AddPaypalAccountForPayOutDto,
  AttachPaymentMethodToStripeForPayInDto,
} from "src/modules/payment-information/common/dto";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { CorporatePaymentInformationService } from "src/modules/payment-information/services";
import {
  IAccountLinkOutput,
  ICreateStripeCustomerForPayInOutput,
  ILoginLinkOutput,
} from "src/modules/payment-information/common/outputs";

@Controller("payment-information/corporate")
export class CorporatePaymentInformationController {
  constructor(private readonly corporatePaymentInformationService: CorporatePaymentInformationService) {}

  /*
   * CORPORATE CLIENT, STRIPE
   */
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-stripe-customer-for-pay-in")
  async createStripeCustomerForPayIn(
    @CurrentUser() user: ITokenUserData,
  ): Promise<ICreateStripeCustomerForPayInOutput> {
    return this.corporatePaymentInformationService.createStripeCustomerForPayIn(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("attach-bank-account-to-stripe-for-pay-in")
  async attachBankAccountToStripeCustomerForPayIn(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: AttachPaymentMethodToStripeForPayInDto,
  ): Promise<void> {
    return this.corporatePaymentInformationService.attachBankAccountToStripeCustomerForPayIn(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Delete("remove-stripe-for-pay-in")
  async deleteStripeForPayIn(@CurrentUser() user: ITokenUserData): Promise<void> {
    return this.corporatePaymentInformationService.deleteStripeForPayIn(user);
  }

  /*
   * CORPORATE INTERPRETER, STRIPE
   */
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-stripe-account-for-pay-out")
  async createStripeAccountForPayOut(@CurrentUser() user: ITokenUserData): Promise<IAccountLinkOutput> {
    return this.corporatePaymentInformationService.createStripeAccountForPayOut(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-stripe-login-link-for-pay-out")
  async createStripeLoginLinkForPayOut(@CurrentUser() user: ITokenUserData): Promise<ILoginLinkOutput> {
    return this.corporatePaymentInformationService.createStripeLoginLinkForPayOut(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Delete("remove-stripe-for-pay-out")
  async deleteStripeForPayOut(@CurrentUser() user: ITokenUserData): Promise<void> {
    return this.corporatePaymentInformationService.deleteStripeForPayOut(user);
  }

  /*
   * CORPORATE INTERPRETER, PAYPAL
   */

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-paypal-for-pay-out")
  async createPaypalForPayOut(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: AddPaypalAccountForPayOutDto,
  ): Promise<void> {
    return this.corporatePaymentInformationService.createPaypalForPayOut(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Delete("remove-paypal-for-pay-out")
  async deletePaypalForPayOut(@CurrentUser() user: ITokenUserData): Promise<void> {
    return this.corporatePaymentInformationService.deletePaypalForPayOut(user);
  }
}
