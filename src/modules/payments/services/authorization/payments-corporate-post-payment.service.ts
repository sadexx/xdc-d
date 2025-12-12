import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PaymentsManagementService, PaymentsNotificationService } from "src/modules/payments/services";
import { EntityManager } from "typeorm";
import { UNDEFINED_VALUE } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { Company } from "src/modules/companies/entities";
import { formatDecimalString } from "src/common/utils";
import {
  EPaymentStatus,
  EPaymentFailedReason,
  EPaymentsErrorCodes,
  EPaymentDirection,
  EPaymentCustomerType,
  EPaymentSystem,
} from "src/modules/payments/common/enums/core";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";
import { TAuthorizeCorporatePostPaymentContext } from "src/modules/payments/common/types/authorization";
import { IHandlePostPaymentAuthorization } from "src/modules/payments/common/interfaces/authorization";

@Injectable()
export class PaymentsCorporatePostPaymentService {
  private readonly lokiLogger = new LokiLogger(PaymentsCorporatePostPaymentService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
  ) {}

  /**
   * Authorizes payment using corporate client's post-payment (credit) system.
   *
   * Increases company's credit usage (depositAmount) by appointment cost, handles
   * credit limit exceeded scenarios, creates payment record with appropriate status,
   * and sends notifications for authorization results.
   *
   * @param manager - Entity manager for transaction
   * @param context - Authorization context with company and credit information
   * @returns Success result if authorization completed successfully
   * @throws {InternalServerErrorException} If post-payment authorization fails
   */
  public async authorizeCorporatePostPayment(
    manager: EntityManager,
    context: TAuthorizeCorporatePostPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      const authorizationResult = await this.handlePostPaymentAuthorization(manager, context);
      await this.createPostPaymentRecord(manager, context, authorizationResult);

      return { success: authorizationResult.status === EPaymentStatus.AUTHORIZED };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to authorize corporate post payment for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.POST_PAYMENT_FAILED);
    }
  }

  /**
   * Creates a payment record for corporate post-payment authorization attempt.
   * Used for both success and failure cases, with status-specific tracking.
   *
   * @param manager - Transaction manager for DB operations
   * @param context - Post-payment context (prices, appointment, company, etc.)
   * @param paymentStatus - Status of the authorization (e.g., PENDING_PAYMENT or AUTHORIZATION_FAILED)
   */
  public async createPostPaymentRecord(
    manager: EntityManager,
    context: TAuthorizeCorporatePostPaymentContext,
    authorizationResult: IHandlePostPaymentAuthorization,
  ): Promise<void> {
    const { currency, prices, appointment, existingPayment, paymentMethodInfo, companyContext } = context;
    const { status, error } = authorizationResult;

    await this.paymentsManagementService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.CORPORATE,
      system: EPaymentSystem.POST_PAYMENT,
      fromClient: appointment.client,
      status,
      note: error,
      existingPayment: existingPayment ?? UNDEFINED_VALUE,
      paymentMethodInfo,
      appointment,
      prices,
      currency,
      company: companyContext.company,
    });
  }

  private async handlePostPaymentAuthorization(
    manager: EntityManager,
    context: TAuthorizeCorporatePostPaymentContext,
  ): Promise<IHandlePostPaymentAuthorization> {
    const { companyAdditionalDataContext, companyContext, appointment } = context;
    const { postPaymentAuthorizationContext } = companyAdditionalDataContext;

    if (postPaymentAuthorizationContext.isExceedingCreditLimit) {
      return await this.handleExceedingCreditLimit(manager, context);
    }

    await manager.getRepository(Company).update(companyContext.company.id, {
      depositAmount: formatDecimalString(postPaymentAuthorizationContext.usedAmountAfterCharge),
    });

    await this.paymentsNotificationService.sendAuthorizationPaymentSuccessNotification(appointment);

    return { status: EPaymentStatus.AUTHORIZED };
  }

  private async handleExceedingCreditLimit(
    manager: EntityManager,
    context: TAuthorizeCorporatePostPaymentContext,
  ): Promise<IHandlePostPaymentAuthorization> {
    const { companyContext } = context;
    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, context.appointment.id);

    if (companyContext.superAdminRole) {
      await this.paymentsNotificationService.sendDepositBalanceInsufficientFundNotification(
        companyContext.company,
        companyContext.superAdminRole,
      );
    }

    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
      context.appointment,
      EPaymentFailedReason.AUTH_FAILED,
    );

    return { status: EPaymentStatus.AUTHORIZATION_FAILED, error: "Company exceeding credit limit" };
  }
}
