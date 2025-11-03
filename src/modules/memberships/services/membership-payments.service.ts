import { BadRequestException, Injectable } from "@nestjs/common";
import {
  TActivateMembership,
  TCancelMembershipSubscriptionUserRole,
  TDeactivateMembership,
  TGetTrialEndTimestampDiscountHolder,
  TProcessAndSavePaymentMembership,
  TProcessMembershipPayment,
  TProcessMembershipPaymentUserRole,
  TProcessMembershipSubscription,
  TProcessMembershipSubscriptionUserRole,
  TUpdateMembershipPrice,
} from "src/modules/memberships/common/types";
import { IGetMembershipPrice } from "src/modules/memberships/common/interfaces";
import {
  EMembershipAssignmentStatus,
  EMembershipErrorCodes,
  membershipTypeOrder,
} from "src/modules/memberships/common/enums";
import { StripePaymentsService, StripeSubscriptionsService } from "src/modules/stripe/services";
import { UNDEFINED_VALUE, NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { UpdateMembershipPriceDto } from "src/modules/memberships/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import Stripe from "stripe";
import { Repository } from "typeorm";
import { findOneOrFailTyped, normalizedAmountToDenormalized } from "src/common/utils";
import { EPaymentSystem } from "src/modules/payments-new/common/enums";
import {
  OldECurrencies,
  OldECustomerType,
  OldEPaymentDirection,
  OldEPaymentStatus,
} from "src/modules/payments/common/enums";
import { UserRole } from "src/modules/users/entities";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import {
  MembershipAssignmentsService,
  MembershipsPriceService,
  MembershipsQueryOptionsService,
} from "src/modules/memberships/services";
import { EmailsService } from "src/modules/emails/services";
import { QueueInitializeService } from "src/modules/queues/services";
import { Payment, PaymentItem } from "src/modules/payments-new/entities";

@Injectable()
export class MembershipPaymentsService {
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,
    private readonly membershipsQueryOptionsService: MembershipsQueryOptionsService,
    private readonly membershipsPriceService: MembershipsPriceService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly stripeSubscriptionsService: StripeSubscriptionsService,
    private readonly stripePaymentsService: StripePaymentsService,
    private readonly emailsService: EmailsService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async createStripeSubscription(
    membership: TProcessMembershipSubscription,
    userRole: TProcessMembershipSubscriptionUserRole,
  ): Promise<void> {
    const { paymentInformation, discountHolder } = userRole;
    const { stripePriceId } = this.membershipsPriceService.getMembershipPrice(membership, userRole);

    if (
      !paymentInformation ||
      !paymentInformation.stripeClientAccountId ||
      !paymentInformation.stripeClientPaymentMethodId ||
      !stripePriceId
    ) {
      throw new BadRequestException(EMembershipErrorCodes.PAYMENTS_PAYMENT_INFO_MISSING);
    }

    const trialEndTimestamp = this.getTrialEndTimestamp(membership, discountHolder);
    await this.stripeSubscriptionsService.createSubscription({
      customerId: paymentInformation.stripeClientAccountId,
      stripeClientPaymentMethodId: paymentInformation.stripeClientPaymentMethodId,
      priceId: stripePriceId,
      metadata: { membershipId: membership.id, userRoleId: userRole.id },
      trialEnd: trialEndTimestamp,
    });
  }

  public async cancelStripeSubscription(userRole: TCancelMembershipSubscriptionUserRole): Promise<void> {
    const { paymentInformation } = userRole;

    if (!paymentInformation || !paymentInformation.stripeClientAccountId) {
      throw new BadRequestException(EMembershipErrorCodes.PAYMENTS_PAYMENT_INFO_NOT_FOUND);
    }

    await this.stripeSubscriptionsService.cancelSubscriptionByCustomerId(paymentInformation.stripeClientAccountId);
  }

  public async updateStripePrice(
    dto: UpdateMembershipPriceDto,
    membershipPrice: TUpdateMembershipPrice,
  ): Promise<string> {
    const basePrice = dto.price ?? membershipPrice.price;
    const gstAmount = dto.gstAmount ?? membershipPrice.gstAmount ?? 0;
    const totalPrice = Number(basePrice) + Number(gstAmount);

    const { priceId } = await this.stripeSubscriptionsService.createNewProductPrice(
      membershipPrice.stripePriceId,
      totalPrice,
      membershipPrice.currency,
    );

    return priceId;
  }

  public async activateSubscriptionProduct(membership: TActivateMembership): Promise<void> {
    const stripePriceId = membership.membershipPrices[0].stripePriceId;
    await this.stripeSubscriptionsService.activateSubscriptionProduct(stripePriceId);
  }

  public async deactivateSubscriptionProduct(membership: TDeactivateMembership): Promise<void> {
    const stripePriceIds = membership.membershipPrices.map((price) => price.stripePriceId);
    await this.stripeSubscriptionsService.deactivateSubscriptionProduct(stripePriceIds);
  }

  public async processMembershipPaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.parent || invoice.parent.type !== "subscription_details" || !invoice.parent.subscription_details) {
      throw new BadRequestException(EMembershipErrorCodes.PAYMENTS_INVOICE_NOT_SUBSCRIPTION);
    }

    const subscription = await this.stripeSubscriptionsService.getSubscription(
      invoice.parent.subscription_details.subscription as string,
    );

    const [firstSubscriptionItem] = subscription.items.data;
    const { membershipId, userRoleId } = subscription.metadata;

    const startDate = new Date(firstSubscriptionItem.current_period_start * NUMBER_OF_MILLISECONDS_IN_SECOND);
    const endDate = new Date(firstSubscriptionItem.current_period_end * NUMBER_OF_MILLISECONDS_IN_SECOND);

    await this.membershipAssignmentsService.processMembershipAssignment(membershipId, userRoleId, startDate, endDate);

    const isTrialPeriod = subscription.status === "trialing";

    if (isTrialPeriod) {
      return;
    }

    const queryOptions = this.membershipsQueryOptionsService.processMembershipPaymentOptions(membershipId, userRoleId);

    const membership = await findOneOrFailTyped<TProcessMembershipPayment>(
      membershipId,
      this.membershipRepository,
      queryOptions.membership,
    );
    const userRole = await findOneOrFailTyped<TProcessMembershipPaymentUserRole>(
      userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    const membershipPrice = this.membershipsPriceService.getMembershipPrice(membership, userRole);
    await this.processAndSavePayment(invoice, membership, userRole, membershipPrice, true);
  }

  public async processMembershipPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.parent || invoice.parent.type !== "subscription_details" || !invoice.parent.subscription_details) {
      throw new BadRequestException(EMembershipErrorCodes.PAYMENTS_INVOICE_NOT_SUBSCRIPTION);
    }

    const subscription = await this.stripeSubscriptionsService.getSubscription(
      invoice.parent.subscription_details.subscription as string,
    );
    const { membershipId, userRoleId } = subscription.metadata;

    const queryOptions = this.membershipsQueryOptionsService.processMembershipPaymentOptions(membershipId, userRoleId);

    const membership = await findOneOrFailTyped<TProcessMembershipPayment>(
      membershipId,
      this.membershipRepository,
      queryOptions.membership,
    );
    const userRole = await findOneOrFailTyped<TProcessMembershipPaymentUserRole>(
      userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    const membershipPrice = this.membershipsPriceService.getMembershipPrice(membership, userRole);
    const payment = await this.processAndSavePayment(invoice, membership, userRole, membershipPrice, false);

    if (userRole.discountHolder && userRole.discountHolder.membershipAssignment) {
      const { membershipAssignment } = userRole.discountHolder;
      await this.membershipAssignmentRepository.update(membershipAssignment.id, {
        status: EMembershipAssignmentStatus.PAYMENT_FAILED,
      });
    }

    const amount = normalizedAmountToDenormalized(invoice.amount_due);
    const currency = invoice.currency.toUpperCase() as OldECurrencies;
    const invoiceNumber = `${userRole.user.platformId}-${payment.platformId}`;
    await this.emailsService.sendMembershipPaymentFailedEmail(
      userRole.profile.contactEmail,
      userRole.profile.preferredName || userRole.profile.firstName,
      amount,
      currency,
      invoiceNumber,
    );
  }

  private getTrialEndTimestamp(
    membership: TProcessMembershipSubscription,
    discountHolder: TGetTrialEndTimestampDiscountHolder | null,
  ): number | undefined {
    if (!discountHolder) {
      return UNDEFINED_VALUE;
    }

    const { membershipAssignment } = discountHolder;

    if (
      !membershipAssignment ||
      membershipAssignment.status !== EMembershipAssignmentStatus.ACTIVE ||
      !membershipAssignment.endDate
    ) {
      return UNDEFINED_VALUE;
    }

    const newMembershipRank = membershipTypeOrder[membership.type];
    const currentMembershipRank = membershipTypeOrder[membershipAssignment.currentMembership.type];

    if (newMembershipRank < currentMembershipRank) {
      return Math.floor(membershipAssignment.endDate.getTime() / NUMBER_OF_MILLISECONDS_IN_SECOND);
    }

    return UNDEFINED_VALUE;
  }

  private async processAndSavePayment(
    invoice: Stripe.Invoice,
    membership: TProcessAndSavePaymentMembership,
    userRole: TProcessMembershipPaymentUserRole,
    membershipPrice: IGetMembershipPrice,
    paymentSucceeded: boolean,
  ): Promise<Payment> {
    const amount = normalizedAmountToDenormalized(paymentSucceeded ? invoice.amount_paid : invoice.amount_due);
    const gstAmount = paymentSucceeded ? membershipPrice.gstAmount || 0 : 0;

    const currency = invoice.currency.toUpperCase() as OldECurrencies;
    const paymentMethodInfo = `Credit Card ${userRole.paymentInformation?.stripeClientLastFour}`;

    const payment = this.paymentRepository.create({
      customerType: OldECustomerType.INDIVIDUAL,
      fromClient: userRole,
      membershipId: membership.id,
      totalGstAmount: gstAmount,
      totalFullAmount: amount,
      totalAmount: paymentSucceeded ? amount - gstAmount : amount,
      system: EPaymentSystem.STRIPE,
      direction: OldEPaymentDirection.INCOMING,
      paymentMethodInfo,
      currency,
    });

    let stripeReceiptKey: string | null = null;

    const finalizedInvoice = invoice as Stripe.Invoice & { payment_intent: string };
    const paymentIntent = await this.stripePaymentsService.getPaymentIntent(finalizedInvoice.payment_intent);

    if (paymentSucceeded) {
      await this.queueInitializeService.addProcessMembershipInvoiceGenerationQueue({
        payment,
        userRole,
        membershipType: membership.type,
      });
      stripeReceiptKey = await this.stripePaymentsService.getPaymentReceipt(
        payment.id,
        paymentIntent.latest_charge as string,
      );
    }

    const savedPayment = await this.paymentRepository.save(payment);
    const paymentItem = this.paymentItemRepository.create({
      externalId: paymentIntent.id,
      fullAmount: amount,
      amount: paymentSucceeded ? amount - gstAmount : 0,
      status: paymentSucceeded ? OldEPaymentStatus.SUCCESS : OldEPaymentStatus.FAILED,
      payment: savedPayment,
      receipt: stripeReceiptKey,
      gstAmount,
      currency,
    });
    await this.paymentItemRepository.save(paymentItem);

    return savedPayment;
  }
}
