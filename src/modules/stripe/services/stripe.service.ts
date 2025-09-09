import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import { IAttachPaymentMethodToCustomer } from "src/modules/stripe/common/interfaces";
import { OldECurrencies } from "src/modules/payments/common/enums";
import { ConfigService } from "@nestjs/config";
import { IStripeSdkData } from "src/modules/stripe/common/interfaces/stripe-sdk-data.interface";
import { denormalizedAmountToNormalized } from "src/common/utils";
import { QueueInitializeService } from "src/modules/queues/services";
import { LokiLogger } from "src/common/logger";
import { ILoginLinkOutput } from "src/modules/payment-information/common/outputs";
import { NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS } from "src/common/constants";

@Injectable()
export class StripeService {
  private readonly lokiLogger = new LokiLogger(StripeService.name);
  private stripe: Stripe;
  private readonly BACK_END_URL: string;

  public constructor(
    private readonly configService: ConfigService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {
    const { secretKey } = this.configService.getOrThrow<IStripeSdkData>("stripe");
    this.stripe = new Stripe(secretKey);
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  public async getCustomers(): Promise<Stripe.Customer[]> {
    const customers = await this.stripe.customers.list({});

    return customers.data;
  }

  public async createCustomer(
    email: string,
    platformId: string,
    isCompany = false,
    isBecsDebit = false,
  ): Promise<IAttachPaymentMethodToCustomer> {
    const customerType: string = isCompany ? "company" : "user";

    const customer = await this.stripe.customers.create({
      email: email,
      description: `Customer for ${customerType} with id ${platformId}`,
    });

    const setupIntentPayload: Stripe.SetupIntentCreateParams = {
      customer: customer.id,
      // automatic_payment_methods: {
      //   enabled: true,
      // },
    };

    if (isBecsDebit) {
      setupIntentPayload.payment_method_types = ["au_becs_debit"];
    }

    const setupIntent = await this.stripe.setupIntents.create(setupIntentPayload);

    return { clientSecret: setupIntent.client_secret, customerId: customer.id };
  }

  public async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  public async createAccount(): Promise<{ accountId: string }> {
    const account = await this.stripe.accounts.create({
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

  public async createAccountLink(accountId: string, isCorporate = false): Promise<Stripe.Response<Stripe.AccountLink>> {
    const redirectUri = this.configService.getOrThrow<string>("frontend.uri");

    let returnUrl = `${redirectUri}/settings/profile/payments?accountId=${accountId}`;
    let refreshUrl = `${redirectUri}/settings/profile/payments?accountId=${accountId}`;

    if (isCorporate) {
      returnUrl = `${redirectUri}/settings/company-information?accountId=${accountId}`;
      refreshUrl = `${redirectUri}/settings/company-information?accountId=${accountId}`;
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });

    return accountLink;
  }

  public async createLoginLink(accountId: string): Promise<ILoginLinkOutput> {
    const loginLink = await this.stripe.accounts.createLoginLink(accountId);

    return { loginLink: loginLink.url };
  }

  public async authorizePayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    customerId: string,
    appointmentPlatformId: string,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      capture_method: "manual",
      confirm: true,
      return_url: `${this.BACK_END_URL}/v1/stripe/add-payment-method`,
      description: `For appointment ${appointmentPlatformId}`,
      // confirmation_method: "manual",
      // payment_method_options: {
      //   card: {
      //     request_three_d_secure: "any",
      //   },
      // },
    });
  }

  public async capturePayment(
    paymentIntentId: string,
    amountToCapture: number | null,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    const data: Stripe.PaymentIntentCaptureParams = {};

    if (amountToCapture) {
      data.amount_to_capture = amountToCapture;
    }

    return this.stripe.paymentIntents.capture(paymentIntentId, data);
  }

  public async chargeByBECSDebit(
    amount: number,
    currency: string,
    paymentMethodId: string,
    customerId: string,
    companyPlatformId: string,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["au_becs_debit"],
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: `Deposit charge for company ${companyPlatformId}`,
    });
  }

  public async cancelAuthorization(paymentIntentId: string): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  public async createTransfer(
    amount: number,
    currency: string,
    destinationAccountId: string,
  ): Promise<Stripe.Response<Stripe.Transfer>> {
    const transfer = await this.stripe.transfers.create({
      amount: amount,
      currency: currency,
      destination: destinationAccountId,
    });

    return transfer;
  }

  public async createPayout(
    amount: number,
    currency: string,
    stripeAccountId: string,
  ): Promise<Stripe.Response<Stripe.Payout>> {
    const balance = await this.stripe.balance.retrieve(
      {
        expand: ["instant_available.net_available"],
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

    if (
      balance.instant_available &&
      balance.instant_available.length > 0 &&
      balance.instant_available[0].net_available
    ) {
      const payout = await this.stripe.payouts.create(
        {
          amount: amount,
          currency: currency,
          //source_type: "bank_account",
          method: "instant",
          destination: balance.instant_available[0].net_available[0].destination,
        },
        {
          stripeAccount: stripeAccountId,
        },
      );

      return payout;
    }

    throw new BadRequestException("Destination not fill!");
  }

  public async getReceipt(latestCharge: string): Promise<ReadableStream<Uint8Array>> {
    const charge = await this.stripe.charges.retrieve(latestCharge);

    const receiptResponse = await fetch(charge.receipt_url as string, {
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!receiptResponse.ok || !receiptResponse.body) {
      throw new UnprocessableEntityException(`Failed to download receipt: ${receiptResponse.statusText}`);
    }

    return receiptResponse.body;
  }

  public async paymentMethodInfo(paymentMethodId: string): Promise<Stripe.Response<Stripe.PaymentMethod>> {
    return await this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  public async returnUrl(data: object): Promise<void> {
    this.lokiLogger.warn(`Incoming request to return URL!, data: ${JSON.stringify(data)}`);
  }

  public async getPaymentIntent(paymentIntentId: string): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  public async getSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  public async createSubscription(
    customerId: string,
    stripeClientPaymentMethodId: string,
    priceId: string,
    metadata: Stripe.Emptyable<Stripe.MetadataParam>,
    trialEnd?: number,
  ): Promise<Stripe.Response<Stripe.Subscription>> {
    await this.cancelSubscriptionByCustomerId(customerId);

    const subscriptionPayload: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: stripeClientPaymentMethodId,
      trial_end: trialEnd ?? "now",
      metadata,
      collection_method: "charge_automatically",
      payment_behavior: "allow_incomplete",
    };

    return await this.stripe.subscriptions.create(subscriptionPayload);
  }

  public async cancelSubscriptionByCustomerId(customerId: string): Promise<void> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      expand: ["data.items"],
      limit: 1,
    });
    const subscription = subscriptions.data[0];

    if (subscription) {
      await this.cancelSubscriptionById(subscription.id);
    }
  }

  public async cancelSubscriptionById(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  public async createNewProductPrice(
    oldPriceId: string,
    price: number,
    currency: OldECurrencies,
  ): Promise<Stripe.Response<Stripe.Price>> {
    const productId = (await this.stripe.prices.retrieve(oldPriceId)).product as string;

    const pricePayload: Stripe.PriceCreateParams = {
      unit_amount: denormalizedAmountToNormalized(price),
      currency: currency,
      recurring: { interval: "month" },
      product: productId,
    };

    return await this.stripe.prices.create(pricePayload);
  }

  public async updateSubscriptionPrice(customerId: string, newPriceId: string): Promise<void> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });
    const subscription = subscriptions.data[0];

    await this.cancelSubscriptionById(subscription.id);
    await this.createSubscription(
      customerId,
      subscription.default_payment_method as string,
      newPriceId,
      subscription.metadata,
      subscription.current_period_end,
    );
  }

  public async activateSubscriptionProduct(priceId: string): Promise<void> {
    const productId = (await this.stripe.prices.retrieve(priceId)).product as string;
    await this.stripe.products.update(productId, { active: true });
  }

  public async deactivateSubscriptionProduct(priceIds: string[]): Promise<void> {
    const priceId = priceIds[0];
    const productId = (await this.stripe.prices.retrieve(priceId)).product as string;
    await this.stripe.products.update(productId, { active: false });

    for (const priceId of priceIds) {
      const subscriptions = await this.stripe.subscriptions.list({
        price: priceId,
        expand: ["data.items"],
      });
      await this.queueInitializeService.addStripeCancelSubscriptionsQueue(subscriptions.data);
    }
  }
}
