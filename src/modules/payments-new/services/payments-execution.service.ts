import { Injectable } from "@nestjs/common";
import { IMakePreAuthorization, IPaymentOperationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import {
  PaymentsAuthorizationService,
  PaymentsCorporateDepositService,
  PaymentsValidationFailedService,
  PaymentsWaitListService,
} from "src/modules/payments-new/services";
import { DataSource } from "typeorm";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";

@Injectable()
export class PaymentsExecutionService {
  constructor(
    private readonly paymentsWaitListService: PaymentsWaitListService,
    private readonly paymentsAuthorizationService: PaymentsAuthorizationService,
    private readonly paymentsCorporateDepositService: PaymentsCorporateDepositService,
    private readonly paymentsValidationFailedService: PaymentsValidationFailedService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly dataSource: DataSource,
  ) {}

  public async makePreAuthorization(data: IMakePreAuthorization): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    await this.dataSource.transaction(async (manager) => {
      switch (strategy) {
        case EPaymentAuthorizationStrategy.WAIT_LIST_REDIRECT:
          operationResult = await this.paymentsWaitListService.redirectPaymentToWaitList(manager, context, {
            isFirstAttemptFailed: false,
            isShortTimeSlot: false,
          });
          break;

        case EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH:
          operationResult = await this.paymentsAuthorizationService.authorizePayment(manager, context, {
            isAdditionalTime: false,
            isShortTimeSlot: false,
          });
          break;

        case EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE:
          operationResult = await this.paymentsCorporateDepositService.chargeFromDeposit(manager, context);
          break;

        case EPaymentAuthorizationStrategy.VALIDATION_FAILED:
          operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
            manager,
            context,
            validationResult,
          );
          break;
      }
    });

    if (operationResult.success) {
      await this.appointmentSharedService.changeAppointmentStatus(context.appointment.id, EAppointmentStatus.PENDING);
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrder(
        context.appointment.appointmentOrder.id,
      );
    }
  }
}
