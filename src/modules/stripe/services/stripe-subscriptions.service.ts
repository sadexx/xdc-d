import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { denormalizedAmountToNormalized } from "src/common/utils";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { QueueInitializeService } from "src/modules/queues/services";
import { ICreateSubscriptionData, ICreateNewProductPrice } from "src/modules/stripe/common/interfaces";
import { StripeSdkService } from "src/modules/stripe/services";

// TODO: optimize subscriptions
@Injectable()
export class StripeSubscriptionsService {
  constructor(
    private readonly stripeSdkService: StripeSdkService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  /**
   * Retrieves an active subscription by its ID.
   * @param subscriptionId - The Stripe subscription ID.
   * @returns {Promise<Stripe.Response<Stripe.Subscription>>}
   */
  public async getSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>> {
    const subscription = await this.stripeSdkService.retrieveSubscription(subscriptionId);

    return subscription;
  }

  /**
   * Creates a new subscription for a customer, canceling any existing active subscription first.
   * Applies trial period if provided and sets metadata.
   * @param data - The subscription creation data including customer ID, price ID, payment method, trial end, and metadata.
   * @returns {Promise<void>}
   */
  public async createSubscription(data: ICreateSubscriptionData): Promise<void> {
    const { customerId, priceId, stripeClientPaymentMethodId, trialEnd, metadata } = data;

    await this.cancelSubscriptionByCustomerId(customerId);

    await this.stripeSdkService.createSubscription({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: stripeClientPaymentMethodId,
      trial_end: trialEnd ?? "now",
      metadata,
      collection_method: "charge_automatically",
      payment_behavior: "allow_incomplete",
    });
  }

  /**
   * Cancels any active subscription for a given customer.
   * Lists active subscriptions and cancels the first one found.
   * @param customerId - The Stripe customer ID.
   * @returns {Promise<void>}
   */
  public async cancelSubscriptionByCustomerId(customerId: string): Promise<void> {
    const subscriptions = await this.stripeSdkService.listSubscriptions({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const [subscription] = subscriptions.data;

    if (subscription) {
      await this.cancelSubscriptionById(subscription.id);
    }
  }

  /**
   * Cancels a subscription by its ID.
   * @param subscriptionId - The Stripe subscription ID.
   * @returns {Promise<void>}
   */
  public async cancelSubscriptionById(subscriptionId: string): Promise<void> {
    await this.stripeSdkService.cancelSubscription(subscriptionId);
  }

  /**
   * Creates a new monthly recurring price for an existing product.
   * Normalizes the price amount and links it to the product's ID.
   * @param oldPriceId - The ID of an existing price to retrieve the product from.
   * @param price - The denormalized price amount.
   * @param currency - The payment currency enum.
   * @returns {Promise<ICreateNewProductPrice>}
   */
  public async createNewProductPrice(
    oldPriceId: string,
    price: number,
    currency: EPaymentCurrency,
  ): Promise<ICreateNewProductPrice> {
    const priceObject = await this.stripeSdkService.retrieveProductPrice(oldPriceId);
    const productId = priceObject.product as string;

    const normalizedAmount = denormalizedAmountToNormalized(price);
    const productPrice = await this.stripeSdkService.createProductPrice({
      unit_amount: normalizedAmount,
      currency: currency,
      recurring: { interval: "month" },
      product: productId,
    });

    return { priceId: productPrice.id };
  }

  /**
   * Updates a customer's subscription to a new price by canceling the old one and creating a new subscription.
   * Preserves the current period end as a trial for seamless transition.
   * @param customerId - The Stripe customer ID.
   * @param newPriceId - The new price ID for the subscription.
   * @returns {Promise<void>}
   */
  public async updateSubscriptionPrice(customerId: string, newPriceId: string): Promise<void> {
    const subscriptions = await this.stripeSdkService.listSubscriptions({
      customer: customerId,
      limit: 1,
    });

    const [subscription] = subscriptions.data;
    const [firstSubscriptionItem] = subscription.items.data;

    await this.cancelSubscriptionById(subscription.id);
    await this.createSubscription({
      customerId,
      stripeClientPaymentMethodId: subscription.default_payment_method as string,
      priceId: newPriceId,
      metadata: subscription.metadata,
      trialEnd: firstSubscriptionItem.current_period_end,
    });
  }

  /**
   * Activates a product associated with a price.
   * Retrieves the product ID from the price and updates its active status.
   * @param priceId - The Stripe price ID.
   * @returns {Promise<void>}
   */
  public async activateSubscriptionProduct(priceId: string): Promise<void> {
    const priceObject = await this.stripeSdkService.retrieveProductPrice(priceId);
    const productId = priceObject.product as string;

    await this.stripeSdkService.updateProduct(productId, { active: true });
  }

  /**
   * Deactivates a product and queues cancellation for all subscriptions using the provided prices.
   * Assumes all priceIds belong to the same product.
   * @param priceIds - Array of Stripe price IDs associated with the product.
   * @returns {Promise<void>}
   */
  public async deactivateSubscriptionProduct(priceIds: string[]): Promise<void> {
    const [priceId] = priceIds;
    const priceObject = await this.stripeSdkService.retrieveProductPrice(priceId);
    const productId = priceObject.product as string;
    await this.stripeSdkService.updateProduct(productId, { active: false });

    for (const priceId of priceIds) {
      const subscriptions = await this.stripeSdkService.listSubscriptions({
        price: priceId,
        expand: ["data.items"],
      });
      await this.queueInitializeService.addStripeCancelSubscriptionsQueue(subscriptions.data);
    }
  }
}
