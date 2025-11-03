import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { Message } from "@aws-sdk/client-sqs";
import {
  EExtBillingReason,
  EExtEventRequirements,
  EExtEventTransfersStatus,
  EExtEventType,
  EExtExternalAccountType,
  EOnboardingStatus,
} from "src/modules/stripe/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { DeepPartial, FindOptionsWhere, Repository } from "typeorm";
import { DEFAULT_COUNTRY, DEFAULT_CURRENCY } from "src/modules/stripe/common/constants/constants";
import { OldEPaymentStatus } from "src/modules/payments/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { findOneOrFail, findOneTyped, round2 } from "src/common/utils";
import { MembershipPaymentsService } from "src/modules/memberships/services";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { EPaymentSystem } from "src/modules/payments-new/common/enums";
import { OldPaymentItem } from "src/modules/payments/entities";
import { randomUUID } from "node:crypto";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { Company } from "src/modules/companies/entities";
import { NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS, UNDEFINED_VALUE } from "src/common/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import {
  TUpdatePaymentItemStatusByDepositCharge,
  TWebhookPaymentIntentSucceeded,
  TWebhookPaymentIntentSucceededCompany,
  UpdatePaymentItemStatusByDepositChargeQuery,
  WebhookPaymentIntentSucceededQuery,
} from "src/modules/webhook-processor/common/types";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class WebhookStripeService {
  private readonly lokiLogger = new LokiLogger(WebhookStripeService.name);

  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    @InjectRepository(OldPaymentItem)
    private readonly paymentItemRepository: Repository<OldPaymentItem>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly membershipPaymentsService: MembershipPaymentsService,
    private readonly notificationService: NotificationService,
    private readonly awsS3Service: AwsS3Service,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async processStripeWebhook(message: Message): Promise<void> {
    try {
      const parsedMessage = JSON.parse(message.Body || "{}")?.detail as Stripe.Event;

      await this.routeWebhook(parsedMessage);
    } catch (error) {
      this.lokiLogger.error(`Failed to process Stripe webhook: ${(error as Error).message}, ${(error as Error).stack}`);

      return;
    }

    return;
  }

  private async routeWebhook(event?: Stripe.Event): Promise<void> {
    if (!event) {
      return;
    }

    if (event.type === EExtEventType.PERSON_CREATED) {
      await this.webhookPersonCreated(event);
    } else if (event.type === EExtEventType.ACCOUNT_UPDATED) {
      await this.webhookAccountUpdated(event);
    } else if (event.type === EExtEventType.ACCOUNT_EXTERNAL_CREATED) {
      await this.webhookAccountExternalCreated(event);
    } else if (event.type === EExtEventType.ACCOUNT_EXTERNAL_UPDATED) {
      await this.webhookAccountExternalUpdated(event);
    } else if (event.type === EExtEventType.ACCOUNT_EXTERNAL_DELETED) {
      await this.webhookAccountExternalDeleted(event);
    } else if (event.type === EExtEventType.INVOICE_PAYMENT_SUCCEEDED) {
      await this.webhookInvoicePaymentSucceeded(event);
    } else if (event.type === EExtEventType.INVOICE_PAYMENT_FAILED) {
      await this.webhookInvoicePaymentFailed(event);
    } else if (event.type === EExtEventType.PAYMENT_INTENT_PROCESSING) {
      await this.webhookPaymentIntentProcessing(event);
    } else if (event.type === EExtEventType.CHARGE_PENDING) {
      await this.webhookChargePending(event);
    } else if (event.type === EExtEventType.PAYMENT_INTENT_CREATED) {
      await this.webhookPaymentIntentCreated(event);
    } else if (event.type === EExtEventType.CHARGE_UPDATED) {
      await this.webhookChargeUpdated(event);
    } else if (event.type === EExtEventType.CHARGE_SUCCEEDED) {
      await this.webhookChargeSucceeded(event);
    } else if (event.type === EExtEventType.PAYMENT_INTENT_SUCCEEDED) {
      await this.webhookPaymentIntentSucceeded(event);
    } else {
      return;
    }
  }

  private async webhookPersonCreated(event: Stripe.PersonCreatedEvent): Promise<void> {
    const paymentInfo = await this.getPaymentInfo(event.account);

    if (!paymentInfo) {
      return;
    }

    await this.paymentInformationRepository.update(
      { id: paymentInfo.id },
      { stripeInterpreterOnboardingStatus: EOnboardingStatus.ONBOARDING_STARTED },
    );

    return;
  }

  private async webhookAccountUpdated(event: Stripe.AccountUpdatedEvent): Promise<void> {
    const paymentInfo = await this.getPaymentInfo(event.account);

    if (!paymentInfo) {
      return;
    }

    const eventData = event.data.object;

    if (
      (eventData.country && eventData.country.toUpperCase() !== DEFAULT_COUNTRY) ||
      (eventData.default_currency && eventData.default_currency.toUpperCase() !== DEFAULT_CURRENCY)
    ) {
      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        { stripeInterpreterOnboardingStatus: EOnboardingStatus.INCORRECT_COUNTRY },
      );

      if (paymentInfo.userRole) {
        this.notificationService
          .sendIncorrectPaymentInformationNotification(paymentInfo.userRole.id)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to send incorrect payment information notification for userRoleId: ${paymentInfo.userRole?.id}`,
              error.stack,
            );
          });
      }

      return;
    }

    if (
      eventData.capabilities &&
      eventData.capabilities.transfers === EExtEventTransfersStatus.ACTIVE &&
      eventData.details_submitted
    ) {
      if (
        eventData.requirements &&
        ((eventData.requirements.currently_due &&
          eventData.requirements.currently_due.some((item) => item.includes(EExtEventRequirements.DOCUMENT_CLIPPED))) ||
          (eventData.requirements.eventually_due &&
            eventData.requirements.eventually_due.some((item) =>
              item.includes(EExtEventRequirements.DOCUMENT_CLIPPED),
            )))
      ) {
        await this.paymentInformationRepository.update(
          { id: paymentInfo.id },
          { stripeInterpreterOnboardingStatus: EOnboardingStatus.NEED_DOCUMENTS },
        );
      } else if (
        eventData.requirements &&
        eventData.requirements.pending_verification &&
        eventData.requirements.pending_verification.some((item) =>
          item.includes(EExtEventRequirements.DOCUMENT_CLIPPED),
        )
      ) {
        await this.paymentInformationRepository.update(
          { id: paymentInfo.id },
          { stripeInterpreterOnboardingStatus: EOnboardingStatus.DOCUMENTS_PENDING },
        );
      } else if (
        eventData.requirements &&
        eventData.requirements.currently_due &&
        eventData.requirements.currently_due.length === 0 &&
        eventData.requirements.eventually_due &&
        eventData.requirements.eventually_due.length === 0 &&
        eventData.requirements.past_due &&
        eventData.requirements.past_due.length === 0 &&
        eventData.requirements.pending_verification &&
        eventData.requirements.pending_verification.length === 0 &&
        eventData.payouts_enabled
      ) {
        const updateData: DeepPartial<PaymentInformation> = {
          stripeInterpreterOnboardingStatus: EOnboardingStatus.ONBOARDING_SUCCESS,
        };

        if (!paymentInfo.paypalPayerId) {
          updateData.interpreterSystemForPayout = EPaymentSystem.STRIPE;
        }

        await this.paymentInformationRepository.update({ id: paymentInfo.id }, updateData);

        if (paymentInfo.userRole) {
          const { userRole } = paymentInfo;
          this.activationTrackingService.checkActivationStepsEnded(paymentInfo.userRole).catch((error: Error) => {
            this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
          });
        }
      } else {
        await this.paymentInformationRepository.update(
          { id: paymentInfo.id },
          {
            note: JSON.stringify([
              ...new Set([
                ...(eventData.requirements?.currently_due || []),
                ...(eventData.requirements?.eventually_due || []),
                ...(eventData.requirements?.past_due || []),
                ...(eventData.requirements?.pending_verification || []),
              ]),
            ]),
          },
        );

        return;
      }
    }
  }

  private async webhookAccountExternalCreated(event: Stripe.AccountExternalAccountCreatedEvent): Promise<void> {
    const paymentInfo = await this.getPaymentInfo(event.account);

    if (!paymentInfo) {
      return;
    }

    const eventData = event.data.object;

    if (eventData.object === EExtExternalAccountType.BANK_ACCOUNT) {
      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        {
          stripeInterpreterBankAccountId: eventData.id,
          stripeInterpreterBankName: eventData.bank_name,
          stripeInterpreterBankAccountLast4: eventData.last4,
        },
      );
    } else if (eventData.object === String(EExtExternalAccountType.CARD)) {
      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        {
          stripeInterpreterCardId: eventData.id,
          stripeInterpreterCardBrand: eventData.brand,
          stripeInterpreterCardLast4: eventData.last4,
        },
      );
    } else {
      this.lokiLogger.error(`Incorrect external account type, account: ${event.account}`);
    }

    return;
  }

  private async webhookAccountExternalUpdated(event: Stripe.AccountExternalAccountUpdatedEvent): Promise<void> {
    const paymentInfo = await this.getPaymentInfo(event.account);

    if (!paymentInfo) {
      return;
    }

    const eventData = event.data.object;

    if (eventData.object === EExtExternalAccountType.BANK_ACCOUNT) {
      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        {
          stripeInterpreterBankAccountId: eventData.id,
          stripeInterpreterBankName: eventData.bank_name,
          stripeInterpreterBankAccountLast4: eventData.last4,
        },
      );
    } else if (eventData.object === String(EExtExternalAccountType.CARD)) {
      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        {
          stripeInterpreterCardId: eventData.id,
          stripeInterpreterCardBrand: eventData.brand,
          stripeInterpreterCardLast4: eventData.last4,
        },
      );
    } else {
      this.lokiLogger.error(`Incorrect external account type, account: ${event.account}`);
    }

    return;
  }

  private async webhookAccountExternalDeleted(event: Stripe.AccountExternalAccountDeletedEvent): Promise<void> {
    if (event.data.object.object === EExtExternalAccountType.BANK_ACCOUNT) {
      const paymentInfo = await this.getPaymentInfo(event.account, event.data.object.id);

      if (!paymentInfo) {
        return;
      }

      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        {
          stripeInterpreterBankAccountId: null,
          stripeInterpreterBankName: null,
          stripeInterpreterBankAccountLast4: null,
        },
      );
    } else if (event.data.object.object === String(EExtExternalAccountType.CARD)) {
      const paymentInfo = await this.getPaymentInfo(event.account, UNDEFINED_VALUE, event.data.object.id);

      if (!paymentInfo) {
        return;
      }

      await this.paymentInformationRepository.update(
        { id: paymentInfo.id },
        {
          stripeInterpreterCardId: null,
          stripeInterpreterCardBrand: null,
          stripeInterpreterCardLast4: null,
        },
      );
    } else {
      this.lokiLogger.error(`Incorrect external account type, account: ${event.account}`);
    }
  }

  private async webhookInvoicePaymentSucceeded(event: Stripe.InvoicePaymentSucceededEvent): Promise<void> {
    switch (event.data.object.billing_reason) {
      case EExtBillingReason.SUBSCRIPTION_CREATE:
      case EExtBillingReason.SUBSCRIPTION_CYCLE:
        await this.membershipPaymentsService.processMembershipPaymentSucceeded(event.data.object);
        break;
      default:
        return;
    }
  }

  private async webhookInvoicePaymentFailed(event: Stripe.InvoicePaymentFailedEvent): Promise<void> {
    switch (event.data.object.billing_reason) {
      case EExtBillingReason.SUBSCRIPTION_CREATE:
      case EExtBillingReason.SUBSCRIPTION_CYCLE:
        await this.membershipPaymentsService.processMembershipPaymentFailed(event.data.object);
        break;
      default:
        return;
    }
  }

  private async webhookPaymentIntentProcessing(event: Stripe.PaymentIntentProcessingEvent): Promise<void> {
    const paymentIntentId = event.data.object.id;

    await this.updatePaymentItemStatusByDepositCharge(
      paymentIntentId,
      event.type,
      OldEPaymentStatus.DEPOSIT_PAYMENT_REQUEST_CREATING,
      event.data.object.id,
    );

    return;
  }

  private async webhookChargePending(event: Stripe.ChargePendingEvent): Promise<void> {
    let paymentIntentId: string | undefined;

    if (typeof event.data.object.payment_intent === "string") {
      paymentIntentId = event.data.object.payment_intent;
    } else {
      paymentIntentId = event.data.object.payment_intent?.id;
    }

    await this.updatePaymentItemStatusByDepositCharge(
      paymentIntentId,
      event.type,
      OldEPaymentStatus.BANK_ACCOUNT_CHARGE_PENDING,
      event.data.object.id,
    );

    return;
  }

  private async webhookPaymentIntentCreated(event: Stripe.PaymentIntentCreatedEvent): Promise<void> {
    const paymentIntentId = event.data.object.id;

    await this.updatePaymentItemStatusByDepositCharge(
      paymentIntentId,
      event.type,
      OldEPaymentStatus.PAYMENT_REQUEST_CREATED,
      event.data.object.id,
    );

    return;
  }

  private async webhookChargeUpdated(event: Stripe.ChargeUpdatedEvent): Promise<void> {
    let paymentIntentId: string | undefined;

    if (typeof event.data.object.payment_intent === "string") {
      paymentIntentId = event.data.object.payment_intent;
    } else {
      paymentIntentId = event.data.object.payment_intent?.id;
    }

    let balanceTransaction: string | undefined;

    if (typeof event.data.object.balance_transaction === "string") {
      balanceTransaction = event.data.object.balance_transaction;
    } else {
      balanceTransaction = event.data.object.balance_transaction?.id;
    }

    await this.updatePaymentItemStatusByDepositCharge(
      paymentIntentId,
      event.type,
      OldEPaymentStatus.BANK_ACCOUNT_CHARGE_TRANSACTION_CREATED,
      event.data.object.id,
      { transferId: balanceTransaction },
    );

    return;
  }

  private async webhookChargeSucceeded(event: Stripe.ChargeSucceededEvent): Promise<void> {
    const additionalItemData: Partial<OldPaymentItem> = {};

    let paymentIntentId: string | undefined;

    if (typeof event.data.object.payment_intent === "string") {
      paymentIntentId = event.data.object.payment_intent;
    } else {
      paymentIntentId = event.data.object.payment_intent?.id;
    }

    const receiptResponse = await fetch(event.data.object.receipt_url as string, {
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!receiptResponse.ok || !receiptResponse.body) {
      this.lokiLogger.warn(
        `Stripe webhook received ${event.type} event without receipt. Event id: ${event.data.object.id}`,
      );
    } else {
      const stripeReceipt = receiptResponse.body;

      const key = `payments/stripe-receipts/${randomUUID()}.html`;

      await this.awsS3Service.uploadObject(key, stripeReceipt as ReadableStream, "text/html");

      additionalItemData.receipt = key;
    }

    await this.updatePaymentItemStatusByDepositCharge(
      paymentIntentId,
      event.type,
      OldEPaymentStatus.BANK_ACCOUNT_CHARGE_SUCCEEDED,
      event.data.object.id,
      additionalItemData,
    );

    return;
  }

  private async webhookPaymentIntentSucceeded(event: Stripe.PaymentIntentSucceededEvent): Promise<void> {
    const paymentIntentId = event.data.object.id;

    const paymentItem = await findOneTyped<TWebhookPaymentIntentSucceeded>(this.paymentItemRepository, {
      select: WebhookPaymentIntentSucceededQuery.select,
      where: { externalId: paymentIntentId },
      relations: WebhookPaymentIntentSucceededQuery.relations,
    });

    if (!paymentItem || !paymentItem.payment || !paymentItem.payment.company) {
      this.lokiLogger.warn(
        `Stripe webhook received ${event.type} event with paymentIntentId ${paymentIntentId}, but not find payment in db`,
      );

      return;
    }

    if (!paymentItem.payment.isDepositCharge || !paymentItem.payment.company) {
      this.lokiLogger.warn(
        `Stripe webhook received ${event.type} event with paymentIntentId ${paymentIntentId}, but payment is not deposit charge`,
      );

      return;
    }

    await this.companyRepository.update(
      { id: paymentItem.payment.company.id },
      {
        depositAmount: round2(Number(paymentItem.payment.company.depositAmount || 0) + Number(paymentItem.fullAmount)),
      },
    );

    await this.paymentItemRepository.update(
      { id: paymentItem.id },
      { status: OldEPaymentStatus.PAYMENT_REQUEST_SUCCEEDED },
    );

    this.sendDepositChargeSuccessNotification(paymentItem.payment.company);

    await this.queueInitializeService.addProcessDepositChargeGenerationQueue(paymentItem.payment);

    return;
  }

  private async getPaymentInfo(
    accountId: string | undefined | null,
    bankAccountId?: string,
    cardId?: string,
  ): Promise<PaymentInformation | null> {
    if (!accountId) {
      this.lokiLogger.error(`Get payment info: account id is undefined`);

      return null;
    }

    const where: FindOptionsWhere<PaymentInformation> = { stripeInterpreterAccountId: accountId };

    if (bankAccountId) {
      where.stripeInterpreterBankAccountId = bankAccountId;
    }

    if (cardId) {
      where.stripeInterpreterCardId = cardId;
    }

    try {
      const paymentInfo = await findOneOrFail(
        accountId,
        this.paymentInformationRepository,
        {
          where: { stripeInterpreterAccountId: accountId },
          relations: {
            userRole: {
              user: true,
              role: true,
            },
          },
        },
        "stripeInterpreterAccountId",
      );

      return paymentInfo;
    } catch (error) {
      this.lokiLogger.error(`Get payment info: payment info not found`, (error as Error).message);

      return null;
    }
  }

  private async updatePaymentItemStatusByDepositCharge(
    paymentIntentId: string | undefined,
    eventType: Stripe.Event.Type,
    status: OldEPaymentStatus,
    eventId: string,
    additionalItemData?: Partial<OldPaymentItem>,
  ): Promise<void> {
    const dataToUpdate: Partial<OldPaymentItem> = {
      ...additionalItemData,
    };

    if (!paymentIntentId) {
      this.lokiLogger.warn(`Stripe webhook received ${eventType} event without paymentIntentId. Event id: ${eventId}`);

      return;
    }

    const paymentItem = await findOneTyped<TUpdatePaymentItemStatusByDepositCharge>(this.paymentItemRepository, {
      select: UpdatePaymentItemStatusByDepositChargeQuery.select,
      where: { externalId: paymentIntentId },
      relations: UpdatePaymentItemStatusByDepositChargeQuery.relations,
    });

    if (!paymentItem) {
      this.lokiLogger.warn(
        `Stripe webhook received ${eventType} event with paymentIntentId ${paymentIntentId}, but not find payment in db`,
      );

      return;
    }

    if (!paymentItem.payment.isDepositCharge) {
      this.lokiLogger.warn(
        `Stripe webhook received ${eventType} event with paymentIntentId ${paymentIntentId}, but payment is not deposit charge`,
      );

      return;
    }

    if (paymentItem.status !== OldEPaymentStatus.PAYMENT_REQUEST_SUCCEEDED) {
      dataToUpdate.status = status;
    }

    await this.paymentItemRepository.update({ id: paymentItem.id }, { ...dataToUpdate });

    return;
  }

  private sendDepositChargeSuccessNotification(company: TWebhookPaymentIntentSucceededCompany): void {
    if (!company.superAdmin) {
      this.lokiLogger.error(`Company ${company.id} does not have superAdminId`);

      return;
    }

    const superAdminRole = company.superAdmin.userRoles.find(
      (userRole) =>
        userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
        userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
    );

    if (superAdminRole) {
      this.notificationService
        .sendDepositChargeSucceededNotification(superAdminRole.id, company.platformId, { companyId: company.id })
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send deposit charge success notification for userRoleId: ${superAdminRole.id}`,
            error.stack,
          );
        });
    }
  }
}
