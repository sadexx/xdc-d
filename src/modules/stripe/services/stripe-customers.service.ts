import { Injectable } from "@nestjs/common";
import { StripeSdkService } from "src/modules/stripe/services";
import Stripe from "stripe";
import { IInitializeCustomerSetup } from "src/modules/stripe/common/interfaces";

@Injectable()
export class StripeCustomersService {
  constructor(private readonly stripeSdkService: StripeSdkService) {}

  /**
   * Initializes a Stripe customer and creates a setup intent for payment method collection.
   * Configures payment method types based on whether it's a corporate or individual customer.
   * @param email - The customer's email address.
   * @param platformId - The platform-specific ID for the user or company.
   * @param isCorporate - Flag indicating if the customer is a corporate entity (uses AU BECS debit).
   * @returns {Promise<IInitializeCustomerSetup>}
   */
  public async initializeCustomerSetup(
    email: string,
    platformId: string,
    isCorporate: boolean,
  ): Promise<IInitializeCustomerSetup> {
    const customerType = isCorporate ? "company" : "user";

    const customer = await this.stripeSdkService.createCustomer({
      email: email,
      description: `Customer for ${customerType} with id ${platformId}`,
    });

    const setupIntentPayload: Stripe.SetupIntentCreateParams = {
      customer: customer.id,
    };

    if (isCorporate) {
      setupIntentPayload.payment_method_types = ["au_becs_debit"];
    } else {
      setupIntentPayload.automatic_payment_methods = { enabled: true };
    }

    const setupIntent = await this.stripeSdkService.createSetupIntent(setupIntentPayload);

    return {
      customerId: customer.id,
      clientSecret: setupIntent.client_secret,
    };
  }

  /**
   * Attaches a payment method to a customer and sets it as the default for invoices.
   * @param paymentMethodId - The Stripe payment method ID.
   * @param customerId - The Stripe customer ID.
   * @returns {Promise<void>}
   */
  public async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void> {
    await this.stripeSdkService.attachPaymentMethod(paymentMethodId, { customer: customerId });

    await this.stripeSdkService.setDefaultPaymentMethod(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }
}
