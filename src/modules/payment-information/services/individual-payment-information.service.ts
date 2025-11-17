import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import {
  AddPaypalAccountForPayOutDto,
  AttachPaymentMethodToStripeForPayInDto,
} from "src/modules/payment-information/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { EPaymentInformationErrorCodes } from "src/modules/payment-information/common/enums";
import { UserRole } from "src/modules/users/entities";
import { findOneOrFailTyped } from "src/common/utils";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { PaypalSdkService } from "src/modules/paypal/services";
import { IProfileInformationResponse } from "src/modules/paypal/common/interfaces";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  IAccountLinkOutput,
  ICreateStripeCustomerForPayInOutput,
  ILoginLinkOutput,
} from "src/modules/payment-information/common/outputs";
import { GeneralPaymentInformationService } from "src/modules/payment-information/services/general-payment-information.service";
import { LokiLogger } from "src/common/logger";
import { EPaymentSystem } from "src/modules/payments/common/enums/core";
import { StripeConnectService, StripeCustomersService } from "src/modules/stripe/services";
import { ICreateAccountLink, IInitializeCustomerSetup } from "src/modules/stripe/common/interfaces";

@Injectable()
export class IndividualPaymentInformationService {
  private readonly lokiLogger = new LokiLogger(IndividualPaymentInformationService.name);
  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly stripeCustomersService: StripeCustomersService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly generalPaymentInformationService: GeneralPaymentInformationService,
  ) {}

  /*
   * Individual client, pay in, stripe
   */

  public async createStripeCustomerForPayIn(user: ITokenUserData): Promise<ICreateStripeCustomerForPayInOutput> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { profile: true, paymentInformation: true, role: true, user: true },
    });

    if (!userRole.profile) {
      throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_PROFILE_NOT_FILLED);
    }

    if (!userRole.profile.contactEmail) {
      throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_CONTACT_EMAIL_NOT_FILLED);
    }

    let customerInfo: IInitializeCustomerSetup | null = null;

    try {
      customerInfo = await this.stripeCustomersService.initializeCustomerSetup(
        userRole.profile.contactEmail,
        userRole.user.platformId || userRole.profile.contactEmail,
        false,
      );
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    return { clientSecret: customerInfo?.clientSecret, customerId: customerInfo.customerId };
  }

  public async attachCardToStripeCustomerForPayIn(
    user: ITokenUserData,
    dto: AttachPaymentMethodToStripeForPayInDto,
  ): Promise<void> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { profile: true, paymentInformation: true, role: true, user: true },
    });

    if (!userRole.profile) {
      throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_PROFILE_NOT_FILLED);
    }

    if (!userRole.profile.contactEmail) {
      throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_CONTACT_EMAIL_NOT_FILLED);
    }

    try {
      await this.stripeCustomersService.attachPaymentMethodToCustomer(dto.paymentMethodId, dto.customerId);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    if (userRole.paymentInformation) {
      await this.paymentInformationRepository.update(
        { id: userRole.paymentInformation.id },
        {
          stripeClientPaymentMethodId: dto.paymentMethodId,
          stripeClientAccountId: dto.customerId,
          stripeClientLastFour: dto.lastFour,
        },
      );
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        stripeClientPaymentMethodId: dto.paymentMethodId,
        stripeClientAccountId: dto.customerId,
        stripeClientLastFour: dto.lastFour,
        userRole,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });
  }

  public async deleteStripeForPayIn(user: ITokenUserData): Promise<void> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true, role: true, user: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    await this.generalPaymentInformationService.checkPaymentMethodDeletionPossibility(userRole.id);

    await this.paymentInformationRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        stripeClientPaymentMethodId: null,
        stripeClientAccountId: null,
        stripeClientLastFour: null,
      },
    );
  }

  /*
   * Individual interpreter, pay out, stripe
   */

  public async createStripeAccountForPayOut(user: ITokenUserData): Promise<IAccountLinkOutput> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true },
    });

    if (
      userRole.paymentInformation &&
      userRole.paymentInformation.stripeInterpreterAccountId &&
      userRole.paymentInformation.stripeInterpreterOnboardingStatus
    ) {
      const onboardingStatus = userRole.paymentInformation.stripeInterpreterOnboardingStatus;

      if (
        onboardingStatus === EOnboardingStatus.NEED_DOCUMENTS ||
        onboardingStatus === EOnboardingStatus.DOCUMENTS_PENDING ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS
      ) {
        throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_ALREADY_ONBOARDED);
      }

      if (
        onboardingStatus === EOnboardingStatus.ACCOUNT_CREATED ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_STARTED
      ) {
        try {
          const accountLink = await this.stripeConnectService.createAccountLink(
            userRole.paymentInformation.stripeInterpreterAccountId,
            false,
          );

          return accountLink;
        } catch (error) {
          throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
        }
      }
    }

    let account: { accountId: string } | null = null;
    let accountLink: ICreateAccountLink | null = null;

    try {
      account = await this.stripeConnectService.createAccount();

      accountLink = await this.stripeConnectService.createAccountLink(account.accountId, false);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    if (userRole.paymentInformation) {
      await this.paymentInformationRepository.update(
        { id: userRole.paymentInformation.id },
        {
          stripeInterpreterAccountId: account.accountId,
          stripeInterpreterOnboardingStatus: EOnboardingStatus.ACCOUNT_CREATED,
        },
      );
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        stripeInterpreterAccountId: account.accountId,
        stripeInterpreterOnboardingStatus: EOnboardingStatus.ACCOUNT_CREATED,
        userRole,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    return accountLink;
  }

  public async createStripeLoginLinkForPayOut(user: ITokenUserData): Promise<ILoginLinkOutput> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    if (!userRole.paymentInformation.stripeInterpreterAccountId) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_STRIPE_ACCOUNT_NOT_EXIST);
    }

    try {
      const loginLink = await this.stripeConnectService.createLoginLink(
        userRole.paymentInformation.stripeInterpreterAccountId,
      );

      return loginLink;
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }
  }

  public async deleteStripeForPayOut(user: ITokenUserData): Promise<void> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true, role: true, user: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    await this.generalPaymentInformationService.checkPaymentMethodDeletionPossibility(userRole.id);

    let interpreterSystemForPayout: EPaymentSystem | null = null;

    if (userRole.paymentInformation.paypalPayerId) {
      interpreterSystemForPayout = EPaymentSystem.PAYPAL;
    }

    await this.paymentInformationRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        stripeInterpreterAccountId: null,
        stripeInterpreterCardId: null,
        stripeInterpreterCardLast4: null,
        stripeInterpreterCardBrand: null,
        stripeInterpreterBankName: null,
        stripeInterpreterBankAccountId: null,
        stripeInterpreterBankAccountLast4: null,
        stripeInterpreterOnboardingStatus: null,
        interpreterSystemForPayout,
      },
    );
  }

  /*
   * Individual interpreter, pay out, paypal
   */

  public async createPaypalForPayOut(user: ITokenUserData, dto: AddPaypalAccountForPayOutDto): Promise<void> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { profile: true, paymentInformation: true, role: true, user: true },
    });

    if (!userRole.profile) {
      throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_PROFILE_NOT_FILLED);
    }

    if (!userRole.profile.contactEmail) {
      throw new BadRequestException(EPaymentInformationErrorCodes.INDIVIDUAL_CONTACT_EMAIL_NOT_FILLED);
    }

    let profile: IProfileInformationResponse | null = null;

    try {
      profile = await this.paypalSdkService.getClientProfile(dto.code);
    } catch (error) {
      throw new UnprocessableEntityException((error as Error).message);
    }

    if (!profile.payer_id) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_PAYPAL_PAYER_ID_MISSING);
    }

    const updateData: DeepPartial<PaymentInformation> = {
      paypalPayerId: profile.payer_id,
      paypalEmail: profile.email,
      paypalAccountVerified: profile.verified_account,
    };

    if (userRole.paymentInformation?.stripeInterpreterOnboardingStatus !== EOnboardingStatus.ONBOARDING_SUCCESS) {
      updateData.interpreterSystemForPayout = EPaymentSystem.PAYPAL;
    }

    if (userRole.paymentInformation) {
      await this.paymentInformationRepository.update({ id: userRole.paymentInformation.id }, updateData);
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        ...updateData,
        userRole,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return;
  }

  public async deletePaypalForPayOut(user: ITokenUserData): Promise<void> {
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true, role: true, user: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    await this.generalPaymentInformationService.checkPaymentMethodDeletionPossibility(userRole.id);

    let interpreterSystemForPayout: EPaymentSystem | null = null;

    if (userRole.paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS) {
      interpreterSystemForPayout = EPaymentSystem.STRIPE;
    }

    await this.paymentInformationRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        paypalEmail: null,
        paypalPayerId: null,
        paypalAccountVerified: null,
        interpreterSystemForPayout,
      },
    );
  }
}
