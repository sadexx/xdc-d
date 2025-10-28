import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import { StripeConnectService, StripeCustomersService } from "src/modules/stripe/services";
import {
  AddPaypalAccountForPayOutDto,
  AttachPaymentMethodToStripeForPayInDto,
} from "src/modules/payment-information/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { EPaymentInformationErrorCodes } from "src/modules/payment-information/common/enums";
import { ICreateAccountLink, IInitializeCustomerSetup } from "src/modules/stripe/common/interfaces";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { PaypalSdkService } from "src/modules/paypal/services";
import { IProfileInformationResponse } from "src/modules/paypal/common/interfaces";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  IAccountLinkOutput,
  ICreateStripeCustomerForPayInOutput,
  ILoginLinkOutput,
} from "src/modules/payment-information/common/outputs";
import { GeneralPaymentInformationService } from "src/modules/payment-information/services";
import { UNDEFINED_VALUE } from "src/common/constants";
import { AccessControlService } from "src/modules/access-control/services";
import { EPaymentSystem } from "src/modules/payments-new/common/enums";

@Injectable()
export class CorporatePaymentInformationService {
  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    private readonly stripeCustomersService: StripeCustomersService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly generalPaymentInformationService: GeneralPaymentInformationService,
    private readonly accessControlService: AccessControlService,
  ) {}

  /*
   * Corporate client, pay in, stripe
   */

  public async createStripeCustomerForPayIn(user: ITokenUserData): Promise<ICreateStripeCustomerForPayInOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {});

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    let customerInfo: IInitializeCustomerSetup | null = null;

    try {
      customerInfo = await this.stripeCustomersService.initializeCustomerSetup(
        company.contactEmail,
        company.platformId,
        true,
      );
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    return { clientSecret: customerInfo?.clientSecret, customerId: customerInfo.customerId };
  }

  public async attachBankAccountToStripeCustomerForPayIn(
    user: ITokenUserData,
    dto: AttachPaymentMethodToStripeForPayInDto,
  ): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    try {
      await this.stripeCustomersService.attachPaymentMethodToCustomer(dto.paymentMethodId, dto.customerId);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    if (company.paymentInformation) {
      await this.paymentInformationRepository.update(
        { id: company.paymentInformation.id },
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
        company,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }
  }

  public async deleteStripeForPayIn(user: ITokenUserData): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    if (!company.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.CORPORATE_PAYMENT_INFO_NOT_FILLED);
    }

    await this.generalPaymentInformationService.checkPaymentMethodDeletionPossibility(UNDEFINED_VALUE, company.id);

    await this.paymentInformationRepository.update(
      { company: { id: company.id } },
      {
        stripeClientPaymentMethodId: null,
        stripeClientAccountId: null,
        stripeClientLastFour: null,
      },
    );
  }

  /*
   * Corporate interpreter, pay out, stripe
   */

  public async createStripeAccountForPayOut(user: ITokenUserData): Promise<IAccountLinkOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    if (
      company.paymentInformation &&
      company.paymentInformation.stripeInterpreterAccountId &&
      company.paymentInformation.stripeInterpreterOnboardingStatus
    ) {
      const onboardingStatus = company.paymentInformation.stripeInterpreterOnboardingStatus;

      if (
        onboardingStatus === EOnboardingStatus.NEED_DOCUMENTS ||
        onboardingStatus === EOnboardingStatus.DOCUMENTS_PENDING ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS
      ) {
        throw new BadRequestException(EPaymentInformationErrorCodes.CORPORATE_ALREADY_ONBOARDED);
      }

      if (
        onboardingStatus === EOnboardingStatus.ACCOUNT_CREATED ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_STARTED
      ) {
        try {
          const accountLink = await this.stripeConnectService.createAccountLink(
            company.paymentInformation.stripeInterpreterAccountId,
            true,
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

      accountLink = await this.stripeConnectService.createAccountLink(account.accountId, true);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    if (company.paymentInformation) {
      await this.paymentInformationRepository.update(
        { id: company.paymentInformation.id },
        {
          stripeInterpreterAccountId: account.accountId,
          stripeInterpreterOnboardingStatus: EOnboardingStatus.ACCOUNT_CREATED,
        },
      );
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        stripeInterpreterAccountId: account.accountId,
        stripeInterpreterOnboardingStatus: EOnboardingStatus.ACCOUNT_CREATED,
        company,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    return accountLink;
  }

  public async createStripeLoginLinkForPayOut(user: ITokenUserData): Promise<ILoginLinkOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    if (!company.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    if (!company.paymentInformation.stripeInterpreterAccountId) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_STRIPE_ACCOUNT_NOT_EXIST);
    }

    try {
      const loginLink = await this.stripeConnectService.createLoginLink(
        company.paymentInformation.stripeInterpreterAccountId,
      );

      return loginLink;
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }
  }

  public async deleteStripeForPayOut(user: ITokenUserData): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    if (!company.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    await this.generalPaymentInformationService.checkPaymentMethodDeletionPossibility(UNDEFINED_VALUE, company.id);

    let interpreterSystemForPayout: EPaymentSystem | null = null;

    if (company.paymentInformation.paypalPayerId) {
      interpreterSystemForPayout = EPaymentSystem.PAYPAL;
    }

    await this.paymentInformationRepository.update(
      { company: { id: company.id } },
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
   * Corporate interpreter, pay out, paypal
   */

  public async createPaypalForPayOut(user: ITokenUserData, dto: AddPaypalAccountForPayOutDto): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    if (!company.contactEmail) {
      throw new BadRequestException(EPaymentInformationErrorCodes.CORPORATE_CONTACT_EMAIL_NOT_FILLED);
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

    if (company.paymentInformation?.stripeInterpreterOnboardingStatus !== EOnboardingStatus.ONBOARDING_SUCCESS) {
      updateData.interpreterSystemForPayout = EPaymentSystem.PAYPAL;
    }

    if (company.paymentInformation) {
      await this.paymentInformationRepository.update({ id: company.paymentInformation.id }, updateData);
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        ...updateData,
        company,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    return;
  }

  public async deletePaypalForPayOut(user: ITokenUserData): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
    }

    if (!company.paymentInformation) {
      throw new BadRequestException(EPaymentInformationErrorCodes.CORPORATE_PAYMENT_INFO_NOT_FILLED);
    }

    await this.generalPaymentInformationService.checkPaymentMethodDeletionPossibility(UNDEFINED_VALUE, company.id);

    let interpreterSystemForPayout: EPaymentSystem | null = null;

    if (company.paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS) {
      interpreterSystemForPayout = EPaymentSystem.STRIPE;
    }

    await this.paymentInformationRepository.update(
      { company: { id: company.id } },
      {
        paypalEmail: null,
        paypalPayerId: null,
        paypalAccountVerified: null,
        interpreterSystemForPayout,
      },
    );
  }
}
