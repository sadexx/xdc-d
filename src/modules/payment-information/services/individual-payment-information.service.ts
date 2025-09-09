import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import { StripeService } from "src/modules/stripe/services";
import {
  AddPaypalAccountForPayOutDto,
  AttachPaymentMethodToStripeForPayInDto,
} from "src/modules/payment-information/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { UserRole } from "src/modules/users/entities";
import { findOneOrFail } from "src/common/utils";
import { IAttachPaymentMethodToCustomer } from "src/modules/stripe/common/interfaces";
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

@Injectable()
export class IndividualPaymentInformationService {
  private readonly lokiLogger = new LokiLogger(IndividualPaymentInformationService.name);
  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly stripeService: StripeService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly generalPaymentInformationService: GeneralPaymentInformationService,
  ) {}

  /*
   * Individual client, pay in, stripe
   */

  public async createStripeCustomerForPayIn(user: ITokenUserData): Promise<ICreateStripeCustomerForPayInOutput> {
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { profile: true, paymentInformation: true, role: true, user: true },
    });

    if (!userRole.profile) {
      throw new BadRequestException("User profile not filled!");
    }

    if (!userRole.profile.contactEmail) {
      throw new BadRequestException("User contact email not filled!");
    }

    let customerInfo: IAttachPaymentMethodToCustomer | null = null;

    try {
      customerInfo = await this.stripeService.createCustomer(
        userRole.profile.contactEmail,
        userRole.user.platformId || userRole.profile.contactEmail,
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
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { profile: true, paymentInformation: true, role: true, user: true },
    });

    if (!userRole.profile) {
      throw new BadRequestException("User profile not filled!");
    }

    if (!userRole.profile.contactEmail) {
      throw new BadRequestException("User contact email not filled!");
    }

    try {
      await this.stripeService.attachPaymentMethodToCustomer(dto.paymentMethodId, dto.customerId);
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
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true, role: true, user: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException("User role payment information not filled!");
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
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
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
        throw new BadRequestException("User already onboarded!");
      }

      if (
        onboardingStatus === EOnboardingStatus.ACCOUNT_CREATED ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_STARTED
      ) {
        try {
          const accountLink = await this.stripeService.createAccountLink(
            userRole.paymentInformation.stripeInterpreterAccountId,
          );

          return { accountLink: accountLink.url };
        } catch (error) {
          throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
        }
      }
    }

    let account: { accountId: string } | null = null;
    let accountLink: Stripe.Response<Stripe.AccountLink> | null = null;

    try {
      account = await this.stripeService.createAccount();

      accountLink = await this.stripeService.createAccountLink(account.accountId);
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

    return { accountLink: accountLink.url };
  }

  public async createStripeLoginLinkForPayOut(user: ITokenUserData): Promise<ILoginLinkOutput> {
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException("User role payment info not fill!");
    }

    if (!userRole.paymentInformation.stripeInterpreterAccountId) {
      throw new BadRequestException("User role stripe account id not exist!");
    }

    try {
      const loginLink = await this.stripeService.createLoginLink(
        userRole.paymentInformation.stripeInterpreterAccountId,
      );

      return loginLink;
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }
  }

  public async deleteStripeForPayOut(user: ITokenUserData): Promise<void> {
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true, role: true, user: true },
    });

    if (!userRole) {
      throw new BadRequestException("User role not exist!");
    }

    if (!userRole.paymentInformation) {
      throw new BadRequestException("User role payment information not filled!");
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
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { profile: true, paymentInformation: true, role: true, user: true },
    });

    if (!userRole.profile) {
      throw new BadRequestException("User profile not filled!");
    }

    if (!userRole.profile.contactEmail) {
      throw new BadRequestException("User contact email not filled!");
    }

    let profile: IProfileInformationResponse | null = null;

    try {
      profile = await this.paypalSdkService.getClientProfile(dto.code);
    } catch (error) {
      throw new UnprocessableEntityException((error as Error).message);
    }

    if (!profile.payer_id) {
      throw new BadRequestException("Paypal profile does not have payer id!");
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
    const userRole = await findOneOrFail(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { paymentInformation: true, role: true, user: true },
    });

    if (!userRole.paymentInformation) {
      throw new BadRequestException("User role payment information not filled!");
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
