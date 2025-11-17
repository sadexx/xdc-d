import { BadRequestException, Injectable } from "@nestjs/common";
import { SetDefaultPayOutMethodDto } from "src/modules/payment-information/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { UserRole } from "src/modules/users/entities";
import { EPaymentInformationErrorCodes } from "src/modules/payment-information/common/enums";
import { COMPANY_ADMIN_ROLES, INDIVIDUAL_ROLES } from "src/common/constants";
import { IGetPaymentInfoOutput } from "src/modules/payment-information/common/outputs";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentInformationQueryOptionsService } from "src/modules/payment-information/services/payment-information-query-options.service";
import { AccessControlService } from "src/modules/access-control/services";
import { EPaymentSystem } from "src/modules/payments/common/enums/core";

@Injectable()
export class GeneralPaymentInformationService {
  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly paymentInformationQueryOptionsService: PaymentInformationQueryOptionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async setDefaultPaymentMethod(user: ITokenUserData, dto: SetDefaultPayOutMethodDto): Promise<void> {
    let paymentInfo: PaymentInformation | null | undefined = null;

    if (isInRoles(INDIVIDUAL_ROLES, user.role)) {
      paymentInfo = await this.paymentInformationRepository.findOne({
        where: { userRole: { id: user.userRoleId } },
      });
    } else if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

      if (!company) {
        throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
      }

      paymentInfo = company.paymentInformation;
    } else {
      throw new BadRequestException(EPaymentInformationErrorCodes.GENERAL_INCORRECT_ROLE);
    }

    if (!paymentInfo) {
      throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_USER_PAYMENT_INFO_NOT_FILLED);
    }

    if (
      paymentInfo.stripeInterpreterOnboardingStatus !== EOnboardingStatus.ONBOARDING_SUCCESS ||
      !paymentInfo.paypalPayerId
    ) {
      throw new BadRequestException(EPaymentInformationErrorCodes.GENERAL_BOTH_SYSTEMS_REQUIRED);
    }

    await this.paymentInformationRepository.update(
      { id: paymentInfo.id },
      { interpreterSystemForPayout: dto.paymentSystem },
    );

    return;
  }

  public async getPaymentInfo(user: ITokenUserData): Promise<IGetPaymentInfoOutput> {
    let paymentInfo: PaymentInformation | null | undefined = null;

    if (isInRoles(INDIVIDUAL_ROLES, user.role)) {
      paymentInfo = await this.paymentInformationRepository.findOne({
        where: { userRole: { id: user.userRoleId } },
      });
    } else if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      const company = await this.accessControlService.getCompanyByRole(user, { paymentInformation: true });

      if (!company) {
        throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
      }

      paymentInfo = company.paymentInformation;
    } else {
      throw new BadRequestException(EPaymentInformationErrorCodes.GENERAL_INCORRECT_ROLE);
    }

    const data: IGetPaymentInfoOutput = {
      client: {
        last4: paymentInfo?.stripeClientLastFour,
      },
      interpreter: {
        selectedSystemForPayout: paymentInfo?.interpreterSystemForPayout,
        stripe: {
          status: paymentInfo?.stripeInterpreterOnboardingStatus,
          bankAccountLast4: paymentInfo?.stripeInterpreterBankAccountLast4,
          cardLast4: paymentInfo?.stripeInterpreterCardLast4,
        },
        paypal: {
          email: paymentInfo?.paypalEmail,
        },
      },
    };

    return data;
  }

  public async mockPaymentInfo(user: ITokenUserData): Promise<void> {
    let paymentInfo: PaymentInformation | null = null;

    const newPaymentInfoData: DeepPartial<PaymentInformation> = {
      stripeClientAccountId: "cus_SDnNHcGsTlWJjm",
      stripeClientPaymentMethodId: "pm_1RJLn1GbKadJtsaS8DBIBih9",
      stripeClientLastFour: "0077",
      stripeInterpreterAccountId: "acct_1RHNFD2cNTabCgKc",
      stripeInterpreterOnboardingStatus: EOnboardingStatus.ONBOARDING_SUCCESS,
      stripeInterpreterBankAccountId: "ba_1RHNLu2cNTabCgKcscEYalcm",
      stripeInterpreterBankAccountLast4: "3456",
      stripeInterpreterBankName: "STRIPE TEST BANK",
      interpreterSystemForPayout: EPaymentSystem.STRIPE,
    };

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      const company = await this.accessControlService.getCompanyByRole(user, {});

      if (!company) {
        throw new BadRequestException(EPaymentInformationErrorCodes.COMMON_COMPANY_NOT_FOUND);
      }

      paymentInfo = await this.paymentInformationRepository.findOne({ where: { company: { id: company.id } } });

      newPaymentInfoData.company = company;
    } else {
      paymentInfo = await this.paymentInformationRepository.findOne({ where: { userRole: { id: user.userRoleId } } });

      const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
        where: { id: user.userRoleId },
      });

      newPaymentInfoData.userRole = userRole;
    }

    if (paymentInfo) {
      await this.paymentInformationRepository.update({ id: paymentInfo.id }, newPaymentInfoData);
    } else {
      const newPaymentInfo = this.paymentInformationRepository.create(newPaymentInfoData);

      await this.paymentInformationRepository.save(newPaymentInfo);
    }

    return;
  }

  public async checkPaymentMethodDeletionPossibility(userRoleId?: string, companyId?: string): Promise<void> {
    const notEndedAppointmentsCountWhere =
      this.paymentInformationQueryOptionsService.getCheckPaymentMethodDeletionPossibilityOptions(userRoleId, companyId);

    const notEndedAppointmentsCount = await this.appointmentRepository.count({
      where: notEndedAppointmentsCountWhere,
    });

    if (notEndedAppointmentsCount > 0) {
      throw new BadRequestException(EPaymentInformationErrorCodes.GENERAL_CANNOT_DELETE_WITH_APPOINTMENTS);
    }
  }
}
