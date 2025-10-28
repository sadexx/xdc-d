import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";
import { IStripeSdkData } from "src/modules/stripe/common/interfaces/stripe-sdk-data.interface";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class StripeSdkService {
  private readonly lokiLogger = new LokiLogger(StripeSdkService.name);
  private stripe: Stripe;

  public constructor(private readonly configService: ConfigService) {
    const { secretKey } = this.configService.getOrThrow<IStripeSdkData>("stripe");
    this.stripe = new Stripe(secretKey);
  }

  public async createCustomer(params: Stripe.CustomerCreateParams): Promise<Stripe.Response<Stripe.Customer>> {
    try {
      const customer = await this.stripe.customers.create(params);

      return customer;
    } catch (error) {
      this.lokiLogger.error(`Failed to create customer: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create customer.");
    }
  }

  public async createSetupIntent(params: Stripe.SetupIntentCreateParams): Promise<Stripe.Response<Stripe.SetupIntent>> {
    try {
      const setupIntent = await this.stripe.setupIntents.create(params);

      return setupIntent;
    } catch (error) {
      this.lokiLogger.error(`Failed to create setup intent: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create setup intent.");
    }
  }

  public async attachPaymentMethod(
    paymentMethodId: string,
    params: Stripe.PaymentMethodAttachParams,
  ): Promise<Stripe.Response<Stripe.PaymentMethod>> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, params);

      return paymentMethod;
    } catch (error) {
      this.lokiLogger.error(`Failed to attach payment method: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to attach payment method.");
    }
  }

  public async setDefaultPaymentMethod(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Response<Stripe.Customer>> {
    try {
      const customer = await this.stripe.customers.update(customerId, params);

      return customer;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to set default payment method: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to set default payment method.");
    }
  }

  public async createAccount(params: Stripe.AccountCreateParams): Promise<Stripe.Response<Stripe.Account>> {
    try {
      const account = await this.stripe.accounts.create(params);

      return account;
    } catch (error) {
      this.lokiLogger.error(`Failed to create account: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create account.");
    }
  }

  public async createAccountLink(params: Stripe.AccountLinkCreateParams): Promise<Stripe.Response<Stripe.AccountLink>> {
    try {
      const accountLink = await this.stripe.accountLinks.create(params);

      return accountLink;
    } catch (error) {
      this.lokiLogger.error(`Failed to create account link: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create account link.");
    }
  }

  public async createLoginLink(accountId: string): Promise<Stripe.Response<Stripe.LoginLink>> {
    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);

      return loginLink;
    } catch (error) {
      this.lokiLogger.error(`Failed to create login link: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create login link.");
    }
  }

  public async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return paymentIntent;
    } catch (error) {
      this.lokiLogger.error(`Failed to retrieve payment intent: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to retrieve payment intent.");
    }
  }

  public async createPaymentIntent(
    params: Stripe.PaymentIntentCreateParams,
    options: Stripe.RequestOptions,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(params, options);

      return paymentIntent;
    } catch (error) {
      this.lokiLogger.error(`Failed to create payment intent: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create payment intent.");
    }
  }

  public async capturePaymentIntent(
    paymentIntentId: string,
    params: Stripe.PaymentIntentCaptureParams,
    options: Stripe.RequestOptions,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(paymentIntentId, params, options);

      return paymentIntent;
    } catch (error) {
      this.lokiLogger.error(`Failed to capture payment intent: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to capture payment intent.");
    }
  }

  public async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      return paymentIntent;
    } catch (error) {
      this.lokiLogger.error(`Failed to cancel payment intent: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to cancel payment intent.");
    }
  }

  public async createTransfer(params: Stripe.TransferCreateParams): Promise<Stripe.Response<Stripe.Transfer>> {
    try {
      const transfer = await this.stripe.transfers.create(params);

      return transfer;
    } catch (error) {
      this.lokiLogger.error(`Failed to create transfer: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create transfer.");
    }
  }

  public async retrieveBalance(
    params: Stripe.BalanceRetrieveParams,
    options: Stripe.RequestOptions,
  ): Promise<Stripe.Response<Stripe.Balance>> {
    try {
      const balance = await this.stripe.balance.retrieve(params, options);

      return balance;
    } catch (error) {
      this.lokiLogger.error(`Failed to retrieve balance: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to retrieve balance.");
    }
  }

  public async createPayout(
    params: Stripe.PayoutCreateParams,
    options: Stripe.RequestOptions,
  ): Promise<Stripe.Response<Stripe.Payout>> {
    try {
      const payout = await this.stripe.payouts.create(params, options);

      return payout;
    } catch (error) {
      this.lokiLogger.error(`Failed to create payout: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create payout.");
    }
  }

  public async retrieveCharge(chargeId: string): Promise<Stripe.Response<Stripe.Charge>> {
    try {
      const charge = await this.stripe.charges.retrieve(chargeId);

      return charge;
    } catch (error) {
      this.lokiLogger.error(`Failed to retrieve charge: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to retrieve charge.");
    }
  }

  public async listSubscriptions(
    params: Stripe.SubscriptionListParams,
  ): Promise<Stripe.ApiListPromise<Stripe.Subscription>> {
    try {
      const subscriptions = await this.stripe.subscriptions.list(params);

      return subscriptions;
    } catch (error) {
      this.lokiLogger.error(`Failed to list subscriptions: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to list subscriptions.");
    }
  }

  public async retrieveSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return subscription;
    } catch (error) {
      this.lokiLogger.error(`Failed to retrieve subscription: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to retrieve subscription.");
    }
  }

  public async createSubscription(
    params: Stripe.SubscriptionCreateParams,
  ): Promise<Stripe.Response<Stripe.Subscription>> {
    try {
      const subscription = await this.stripe.subscriptions.create(params);

      return subscription;
    } catch (error) {
      this.lokiLogger.error(`Failed to create subscription: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create subscription.");
    }
  }

  public async cancelSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);

      return subscription;
    } catch (error) {
      this.lokiLogger.error(`Failed to cancel subscription: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to cancel subscription.");
    }
  }

  public async retrieveProductPrice(priceId: string): Promise<Stripe.Response<Stripe.Price>> {
    try {
      const productPrice = await this.stripe.prices.retrieve(priceId);

      return productPrice;
    } catch (error) {
      this.lokiLogger.error(`Failed to retrieve product price: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to retrieve product price.");
    }
  }

  public async createProductPrice(params: Stripe.PriceCreateParams): Promise<Stripe.Response<Stripe.Price>> {
    try {
      const productPrice = await this.stripe.prices.create(params);

      return productPrice;
    } catch (error) {
      this.lokiLogger.error(`Failed to create product price: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to create product price.");
    }
  }

  public async updateProduct(
    productId: string,
    params: Stripe.ProductUpdateParams,
  ): Promise<Stripe.Response<Stripe.Product>> {
    try {
      const product = await this.stripe.products.update(productId, params);

      return product;
    } catch (error) {
      this.lokiLogger.error(`Failed to update product: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to update product.");
    }
  }
}
