import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  TActivateMembership,
  TCancelMembershipSubscriptionUserRole,
  TDeactivateMembership,
  TGetTrialEndTimestampDiscountHolder,
  TProcessAndSavePaymentMembership,
  TProcessAndSavePaymentUserRole,
  TProcessMembershipPayment,
  TProcessMembershipPaymentUserRole,
  TProcessMembershipSubscription,
  TProcessMembershipSubscriptionUserRole,
  TUpdateMembershipPrice,
} from "src/modules/memberships/common/types";
import { IGetMembershipPrice } from "src/modules/memberships/common/interfaces";
import { EMembershipAssignmentStatus, membershipTypeOrder } from "src/modules/memberships/common/enums";
import { StripeService } from "src/modules/stripe/services";
import { UNDEFINED_VALUE, NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { UpdateMembershipPriceDto } from "src/modules/memberships/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import { Repository } from "typeorm";
import { findOneOrFailTyped, normalizedAmountToDenormalized } from "src/common/utils";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import {
  OldECurrencies,
  OldECustomerType,
  OldEPaymentDirection,
  OldEPaymentStatus,
} from "src/modules/payments/common/enums";
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import { UserRole } from "src/modules/users/entities";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { PdfBuilderService } from "src/modules/pdf/services";
import {
  MembershipAssignmentsService,
  MembershipsPriceService,
  MembershipsQueryOptionsService,
} from "src/modules/memberships/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";

@Injectable()
export class MembershipPaymentsService {
  private readonly BACK_END_URL: string;

  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(OldPaymentItem)
    private readonly paymentItemRepository: Repository<OldPaymentItem>,
    private readonly membershipsQueryOptionsService: MembershipsQueryOptionsService,
    private readonly membershipsPriceService: MembershipsPriceService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly stripeService: StripeService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

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
      throw new BadRequestException("User payment or membership pricing information is missing.");
    }

    const trialEndTimestamp = this.getTrialEndTimestamp(membership, discountHolder);
    await this.stripeService.createSubscription(
      paymentInformation.stripeClientAccountId,
      paymentInformation.stripeClientPaymentMethodId,
      stripePriceId,
      { membershipId: membership.id, userRoleId: userRole.id },
      trialEndTimestamp,
    );
  }

  public async cancelStripeSubscription(userRole: TCancelMembershipSubscriptionUserRole): Promise<void> {
    const { paymentInformation } = userRole;

    if (!paymentInformation || !paymentInformation.stripeClientAccountId) {
      throw new BadRequestException("User payment information not found.");
    }

    await this.stripeService.cancelSubscriptionByCustomerId(paymentInformation.stripeClientAccountId);
  }

  public async updateStripePrice(
    dto: UpdateMembershipPriceDto,
    membershipPrice: TUpdateMembershipPrice,
  ): Promise<string> {
    const basePrice = dto.price ?? membershipPrice.price;
    const gstAmount = dto.gstAmount ?? membershipPrice.gstAmount ?? 0;
    const totalPrice = Number(basePrice) + Number(gstAmount);

    const newStripePrice = await this.stripeService.createNewProductPrice(
      membershipPrice.stripePriceId,
      totalPrice,
      membershipPrice.currency,
    );

    return newStripePrice.id;
  }

  public async activateSubscriptionProduct(membership: TActivateMembership): Promise<void> {
    const stripePriceId = membership.membershipPrices[0].stripePriceId;
    await this.stripeService.activateSubscriptionProduct(stripePriceId);
  }

  public async deactivateSubscriptionProduct(membership: TDeactivateMembership): Promise<void> {
    const stripePriceIds = membership.membershipPrices.map((price) => price.stripePriceId);
    await this.stripeService.deactivateSubscriptionProduct(stripePriceIds);
  }

  public async processMembershipPaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await this.stripeService.getSubscription(invoice.subscription as string);
    const { membershipId, userRoleId } = subscription.metadata;

    const startDate = new Date(subscription.start_date * NUMBER_OF_MILLISECONDS_IN_SECOND);
    const endDate = new Date(subscription.current_period_end * NUMBER_OF_MILLISECONDS_IN_SECOND);

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
    const payment = await this.processAndSavePayment(invoice, membership, userRole, membershipPrice, true);

    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${payment.receipt}`;
    await this.emailsService.sendMembershipPaymentSucceededEmail(
      userRole.profile.contactEmail,
      userRole.profile.preferredName || userRole.profile.firstName,
      membership.type,
      receiptLink,
    );
  }

  public async processMembershipPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await this.stripeService.getSubscription(invoice.subscription as string);
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
    userRole: TProcessAndSavePaymentUserRole,
    membershipPrice: IGetMembershipPrice,
    paymentSucceeded: boolean,
  ): Promise<OldPayment> {
    const amount = normalizedAmountToDenormalized(paymentSucceeded ? invoice.amount_paid : invoice.amount_due);
    const gstAmount = paymentSucceeded ? membershipPrice.gstAmount || 0 : 0;

    const currency = invoice.currency.toUpperCase() as OldECurrencies;
    const paymentMethodInfo = `Credit Card ${userRole.paymentInformation?.stripeClientLastFour}`;

    const payment = this.paymentRepository.create({
      customerType: OldECustomerType.INDIVIDUAL,
      fromClientId: userRole.id,
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
    const paymentIntent = await this.stripeService.getPaymentIntent(invoice.payment_intent as string);

    if (paymentSucceeded) {
      const membershipReceipt = await this.pdfBuilderService.generateMembershipInvoice(
        payment,
        userRole,
        membership.type,
        currency,
      );
      payment.receipt = membershipReceipt.receiptKey;

      const stripeReceipt = await this.stripeService.getReceipt(paymentIntent.latest_charge as string);

      stripeReceiptKey = `payments/stripe-receipts/${randomUUID()}.html`;
      await this.awsS3Service.uploadObject(stripeReceiptKey, stripeReceipt as ReadableStream, "text/html");
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
