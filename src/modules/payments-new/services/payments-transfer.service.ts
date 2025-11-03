import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentStatus,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments-new/common/enums";
import {
  ICreatePaymentRecordResult,
  IPaymentCalculationResult,
  IPaymentExternalOperationResult,
  IPaymentOperationResult,
} from "src/modules/payments-new/common/interfaces";
import { EntityManager } from "typeorm";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments-new/services";
import { PaymentItem } from "src/modules/payments-new/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UNDEFINED_VALUE } from "src/common/constants";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class PaymentsTransferService {
  private readonly lokiLogger = new LokiLogger(PaymentsTransferService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
  ) {}

  public async makeRecordToPayOutWaitList(
    manager: EntityManager,
    context: ITransferPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { interpreter, appointment, interpreterPrices, currency, company } = context;
    try {
      await this.paymentsManagementService.createPaymentRecord(manager, {
        direction: EPaymentDirection.OUTCOMING,
        customerType: EPaymentCustomerType.CORPORATE,
        status: EPaymentStatus.WAITING_FOR_PAYOUT,
        toInterpreter: interpreter,
        appointment,
        currency,
        note: "Waiting for Payout",
        company: company ?? UNDEFINED_VALUE,
        prices: interpreterPrices as IPaymentCalculationResult,
        system: interpreter.paymentInformation.interpreterSystemForPayout,
      });

      return { success: true };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to make pay out record to interpreter id: ${interpreter.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException("Failed to make pay out record.");
    }
  }

  public async transferAndPayout(
    manager: EntityManager,
    context: ITransferPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { interpreter } = context;
    try {
      const transferResult = await this.createTransfer(context);
      const paymentRecordResult = await this.createTransferPaymentRecord(manager, context, transferResult);

      if (transferResult.status === EPaymentStatus.TRANSFERED) {
        await this.handleTransferredPayment(manager, paymentRecordResult, context);
      }

      return { success: transferResult.status === EPaymentStatus.TRANSFERED, paymentRecordResult };
    } catch (error) {
      this.lokiLogger.error(`Failed to transfer payment to interpreter id: ${interpreter.id}`, (error as Error).stack);
      throw new InternalServerErrorException("Failed to transfer payment.");
    }
  }

  private async handleTransferredPayment(
    manager: EntityManager,
    paymentRecordResult: ICreatePaymentRecordResult,
    context: ITransferPaymentContext,
  ): Promise<void> {
    const { appointment, interpreterPrices, currency, interpreter, isPersonalCard } = context;

    if (interpreter.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE && isPersonalCard) {
      await this.createStripePayout(manager, context, paymentRecordResult);
    }

    await manager.getRepository(Appointment).update(appointment.id, {
      receivedByInterpreter: interpreterPrices.interpreterFullAmount,
      receivedByInterpreterGst: interpreterPrices.interpreterGstAmount,
      interpreterCurrency: currency,
    });
  }

  private async createTransfer(context: ITransferPaymentContext): Promise<IPaymentExternalOperationResult> {
    const { interpreter, interpreterPrices, currency, appointment } = context;
    switch (interpreter.paymentInformation.interpreterSystemForPayout) {
      case EPaymentSystem.STRIPE:
        return await this.paymentsExternalOperationsService.attemptStripeTransfer(
          interpreterPrices.interpreterFullAmount,
          currency,
          interpreter.paymentInformation.stripeInterpreterAccountId,
          appointment.id,
        );
      default:
        return await this.paymentsExternalOperationsService.attemptPaypalTransfer(
          interpreterPrices.interpreterFullAmount,
          currency,
          interpreter.paymentInformation.paypalPayerId,
          appointment.platformId,
          appointment.id,
          false,
        );
    }
  }

  private async createStripePayout(
    manager: EntityManager,
    context: ITransferPaymentContext,
    paymentRecordResult: ICreatePaymentRecordResult,
  ): Promise<void> {
    const { interpreterPrices, interpreter, currency } = context;
    const { payment } = paymentRecordResult;
    const externalOperationResult = await this.paymentsExternalOperationsService.attemptStripePayout(
      interpreterPrices.interpreterFullAmount,
      currency,
      interpreter.paymentInformation.stripeInterpreterAccountId,
      payment.id,
    );

    await manager
      .getRepository(PaymentItem)
      .update(
        { payment: { id: payment.id } },
        { status: externalOperationResult.status, externalId: externalOperationResult.payoutId },
      );
  }

  private async createTransferPaymentRecord(
    manager: EntityManager,
    context: ITransferPaymentContext,
    externalOperationResult: IPaymentExternalOperationResult,
  ): Promise<ICreatePaymentRecordResult> {
    const { interpreter, appointment, interpreterPrices, currency, paymentMethodInfo } = context;

    return await this.paymentsManagementService.createPaymentRecord(manager, {
      direction: EPaymentDirection.OUTCOMING,
      customerType: EPaymentCustomerType.INDIVIDUAL,
      stripeInterpreterPayoutType: EStripeInterpreterPayOutType.INTERNAL,
      toInterpreter: interpreter,
      note: externalOperationResult.error,
      status: externalOperationResult.status,
      transferId: externalOperationResult.transferId,
      currency,
      appointment,
      paymentMethodInfo,
      system: interpreter.paymentInformation.interpreterSystemForPayout,
      prices: interpreterPrices as IPaymentCalculationResult,
    });
  }
}
