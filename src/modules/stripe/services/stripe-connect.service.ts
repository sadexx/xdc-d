import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StripeSdkService } from "src/modules/stripe/services";
import {
  ICreateAccount,
  ICreateAccountLink,
  ICreateLoginLink,
  ICreateTransfer,
  ICreatePayout,
} from "src/modules/stripe/common/interfaces";

@Injectable()
export class StripeConnectService {
  private readonly FRONT_END_URL: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly stripeSdkService: StripeSdkService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  /**
   * Creates a new Stripe Connect account for a platform user or company.
   * Configures the account as an Express account with application handling fees and losses.
   * @returns {Promise<ICreateAccount>}
   */
  public async createAccount(): Promise<ICreateAccount> {
    const account = await this.stripeSdkService.createAccount({
      controller: {
        stripe_dashboard: {
          type: "express",
        },
        fees: {
          payer: "application",
        },
        losses: {
          payments: "application",
        },
      },
    });

    return { accountId: account.id };
  }

  /**
   * Creates a Stripe Connect account link for onboarding.
   * Generates return and refresh URLs based on whether the account is corporate or individual.
   * @param accountId - The Stripe Connect account ID.
   * @param isCorporate - Flag indicating if the account is for a corporate entity.
   * @returns {Promise<ICreateAccountLink>}
   */
  public async createAccountLink(accountId: string, isCorporate: boolean): Promise<ICreateAccountLink> {
    let returnUrl = `${this.FRONT_END_URL}/settings/profile/payments?accountId=${accountId}`;
    let refreshUrl = `${this.FRONT_END_URL}/settings/profile/payments?accountId=${accountId}`;

    if (isCorporate) {
      returnUrl = `${this.FRONT_END_URL}/settings/company-information?accountId=${accountId}`;
      refreshUrl = `${this.FRONT_END_URL}/settings/company-information?accountId=${accountId}`;
    }

    const accountLink = await this.stripeSdkService.createAccountLink({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });

    return { accountLink: accountLink.url };
  }

  /**
   * Creates a login link for a Stripe Connect account.
   * Allows the connected account holder to log in to their Stripe dashboard.
   * @param accountId - The Stripe Connect account ID.
   * @returns {Promise<ICreateLoginLink>}
   */
  public async createLoginLink(accountId: string): Promise<ICreateLoginLink> {
    const loginLink = await this.stripeSdkService.createLoginLink(accountId);

    return { loginLink: loginLink.url };
  }

  /**
   * Creates a transfer from the platform to a connected account.
   * Transfers the specified amount in the given currency to the destination account.
   * @param amount - The amount to transfer (in the smallest currency unit, e.g., cents).
   * @param currency - The three-letter ISO currency code.
   * @param destinationAccountId - The Stripe ID of the destination connected account.
   * @returns {Promise<ICreateTransfer>}
   */
  public async createTransfer(
    amount: number,
    currency: string,
    destinationAccountId: string,
  ): Promise<ICreateTransfer> {
    const transfer = await this.stripeSdkService.createTransfer({
      amount: amount,
      currency: currency,
      destination: destinationAccountId,
    });

    return { transferId: transfer.id };
  }

  /**
   * Creates an instant payout from a connected account's balance.
   * Verifies available instant balance and destination before creating the payout.
   * @param amount - The payout amount (in the smallest currency unit).
   * @param currency - The three-letter ISO currency code.
   * @param stripeAccountId - The Stripe ID of the connected account.
   * @returns {Promise<ICreatePayout>}
   * @throws {BadRequestException}
   */
  public async createPayout(amount: number, currency: string, stripeAccountId: string): Promise<ICreatePayout> {
    const balance = await this.stripeSdkService.retrieveBalance(
      { expand: ["instant_available.net_available"] },
      { stripeAccount: stripeAccountId },
    );

    const instantAvailable = balance.instant_available;

    if (
      !instantAvailable ||
      instantAvailable.length === 0 ||
      !instantAvailable[0].net_available ||
      instantAvailable[0].net_available.length === 0 ||
      !instantAvailable[0].net_available[0].destination
    ) {
      throw new BadRequestException("Required instant available balance or destination is missing for the account.");
    }

    const destinationId = instantAvailable[0].net_available[0].destination;
    const payout = await this.stripeSdkService.createPayout(
      {
        amount: amount,
        currency: currency,
        method: "instant",
        destination: destinationId,
      },
      { stripeAccount: stripeAccountId },
    );

    return { payoutId: payout.id };
  }
}
