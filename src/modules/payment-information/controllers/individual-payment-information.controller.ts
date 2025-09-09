import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import {
  AddPaypalAccountForPayOutDto,
  AttachPaymentMethodToStripeForPayInDto,
} from "src/modules/payment-information/common/dto";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IndividualPaymentInformationService } from "src/modules/payment-information/services";
import {
  IAccountLinkOutput,
  ICreateStripeCustomerForPayInOutput,
  ILoginLinkOutput,
} from "src/modules/payment-information/common/outputs";

@Controller("payment-information/individual")
export class IndividualPaymentInformationController {
  constructor(private readonly individualPaymentInformationService: IndividualPaymentInformationService) {}

  /*
   * INDIVIDUAL CLIENT, STRIPE
   */
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-stripe-customer-for-pay-in")
  async createStripeCustomerForPayIn(
    @CurrentUser() user: ITokenUserData,
  ): Promise<ICreateStripeCustomerForPayInOutput> {
    return this.individualPaymentInformationService.createStripeCustomerForPayIn(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("attach-card-to-stripe-for-pay-in")
  async attachCardToStripeCustomerForPayIn(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: AttachPaymentMethodToStripeForPayInDto,
  ): Promise<void> {
    return this.individualPaymentInformationService.attachCardToStripeCustomerForPayIn(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Delete("remove-stripe-for-pay-in")
  async deleteStripeForPayIn(@CurrentUser() user: ITokenUserData): Promise<void> {
    return this.individualPaymentInformationService.deleteStripeForPayIn(user);
  }

  /*
   * INDIVIDUAL INTERPRETER, STRIPE
   */
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-stripe-account-for-pay-out")
  async createStripeAccountForPayOut(@CurrentUser() user: ITokenUserData): Promise<IAccountLinkOutput> {
    return this.individualPaymentInformationService.createStripeAccountForPayOut(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-stripe-login-link-for-pay-out")
  async createStripeLoginLinkForPayOut(@CurrentUser() user: ITokenUserData): Promise<ILoginLinkOutput> {
    return this.individualPaymentInformationService.createStripeLoginLinkForPayOut(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Delete("remove-stripe-for-pay-out")
  async deleteStripeForPayOut(@CurrentUser() user: ITokenUserData): Promise<void> {
    return this.individualPaymentInformationService.deleteStripeForPayOut(user);
  }

  /*
   * INDIVIDUAL INTERPRETER, PAYPAL
   */

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-paypal-for-pay-out")
  async createPaypalForPayOut(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: AddPaypalAccountForPayOutDto,
  ): Promise<void> {
    return this.individualPaymentInformationService.createPaypalForPayOut(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Delete("remove-paypal-for-pay-out")
  async deletePaypalForPayOut(@CurrentUser() user: ITokenUserData): Promise<void> {
    return this.individualPaymentInformationService.deletePaypalForPayOut(user);
  }
}
