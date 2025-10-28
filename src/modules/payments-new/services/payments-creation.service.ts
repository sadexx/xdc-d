import { Injectable } from "@nestjs/common";
import { Payment, PaymentItem } from "src/modules/payments-new/entities";
import {
  ICreatePaymentRecord,
  ICreatePaymentRecordResult,
  IPayment,
  IPaymentItem,
} from "src/modules/payments-new/common/interfaces";
import { EntityManager } from "typeorm";
import { EPaymentStatus } from "src/modules/payments-new/common/enums";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";
import { TCreatePaymentRecordPayment } from "src/modules/payments-new/common/types";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Injectable()
export class PaymentsCreationService {
  /**
   * Creates a new payment record or extends an existing one by adding a payment item.
   * Handles platform ID generation, entity persistence, and conditional totals update.
   * Intended for use within a database transaction to ensure atomicity.
   *
   * @param manager - The TypeORM EntityManager for transactional operations.
   * @param data - The input data for creating the payment record.
   * @returns An object containing the (new or existing) payment entity and the newly created payment item.
   */
  public async createPaymentRecord(
    manager: EntityManager,
    data: ICreatePaymentRecord,
  ): Promise<ICreatePaymentRecordResult> {
    const { existingPayment } = data;
    let payment: Payment | undefined = existingPayment as Payment;

    if (!payment) {
      payment = await this.constructAndCreatePayment(manager, data);
    }

    const paymentItem = await this.constructAndCreatePaymentItem(manager, data, payment);

    if (existingPayment && data.status === EPaymentStatus.AUTHORIZED) {
      await this.updatePaymentTotals(manager, existingPayment, data);
    }

    return { payment, paymentItem };
  }

  private async constructAndCreatePayment(manager: EntityManager, data: ICreatePaymentRecord): Promise<Payment> {
    const newPaymentDto = await this.constructPaymentDto(data);

    return await this.createPayment(manager, newPaymentDto);
  }

  private async constructAndCreatePaymentItem(
    manager: EntityManager,
    data: ICreatePaymentRecord,
    payment: Payment,
  ): Promise<PaymentItem> {
    const newPaymentItemDto = this.constructPaymentItemDto(data, payment);

    return await this.createPaymentItem(manager, newPaymentItemDto);
  }

  private async updatePaymentTotals(
    manager: EntityManager,
    existingPayment: TCreatePaymentRecordPayment,
    data: ICreatePaymentRecord,
  ): Promise<void> {
    if (data.status !== EPaymentStatus.AUTHORIZED) {
      return;
    }

    const { prices } = data;

    const totalAmount = existingPayment.totalAmount + (prices?.clientAmount ?? 0);
    const totalGstAmount = existingPayment.totalGstAmount + (prices?.clientGstAmount ?? 0);
    const totalFullAmount = totalAmount + totalGstAmount;

    await manager
      .getRepository(Payment)
      .update({ id: existingPayment.id }, { totalAmount, totalGstAmount, totalFullAmount });
  }

  private async createPayment(manager: EntityManager, data: IPayment): Promise<Payment> {
    const paymentRepository = manager.getRepository(Payment);
    const newPaymentDto = paymentRepository.create(data);

    return await paymentRepository.save(newPaymentDto);
  }

  private async createPaymentItem(manager: EntityManager, dto: IPaymentItem): Promise<PaymentItem> {
    const paymentItemRepository = manager.getRepository(PaymentItem);

    const newPaymentItemDto = paymentItemRepository.create(dto);

    return await paymentItemRepository.save(newPaymentItemDto);
  }

  private async generatePaymentPlatformId(data: ICreatePaymentRecord): Promise<string> {
    const { membershipId, fromClient, isDepositCharge, company, appointment } = data;

    if (appointment) {
      return `${appointment.platformId}`;
    }

    const platformId = await setPlatformId(ESequenceName.PAYMENT);

    if (membershipId && fromClient) {
      return `${fromClient.user.platformId}-${platformId}`;
    }

    if (isDepositCharge && company) {
      return `${company.platformId}-${platformId}`;
    }

    return platformId;
  }

  private async constructPaymentDto(data: ICreatePaymentRecord): Promise<IPayment> {
    const { prices } = data;

    const platformId = await this.generatePaymentPlatformId(data);

    const determinedFromClient = data.fromClient ? (data.fromClient as UserRole) : null;
    const determinedCompany = data.company ? (data.company as Company) : null;
    const determinedAppointment = data.appointment ? (data.appointment as Appointment) : null;

    return {
      platformId,
      totalAmount: prices?.clientAmount ?? 0,
      totalGstAmount: prices?.clientGstAmount ?? 0,
      totalFullAmount: prices?.clientFullAmount ?? 0,
      estimatedCostAmount: prices?.clientFullAmount ?? 0,
      currency: data.currency,
      direction: data.direction,
      customerType: data.customerType,
      system: data.system,
      paymentMethodInfo: data.paymentMethodInfo,
      fromClient: determinedFromClient,
      toInterpreter: null,
      company: determinedCompany,
      appointment: determinedAppointment,
      isDepositCharge: data.isDepositCharge ?? false,
      note: data.note ?? null,
      membershipId: data.membershipId ?? null,
      stripeInterpreterPayoutType: null,
    };
  }

  private constructPaymentItemDto(data: ICreatePaymentRecord, payment: Payment): IPaymentItem {
    const { prices } = data;

    return {
      amount: prices?.clientAmount ?? 0,
      gstAmount: prices?.clientGstAmount ?? 0,
      fullAmount: prices?.clientFullAmount ?? 0,
      currency: data.currency,
      status: data.status,
      note: data.note ?? null,
      transferId: data.transferId ?? null,
      externalId: data.externalId ?? null,
      appliedPromoCode: prices?.discountRate?.promoCode ?? null,
      appliedMembershipType: prices?.discountRate?.membershipType ?? null,
      appliedPromoDiscountsPercent: prices?.discountRate?.promoCampaignDiscount ?? null,
      appliedMembershipDiscountsPercent: prices?.discountRate?.membershipDiscount ?? null,
      appliedPromoDiscountsMinutes: prices?.appliedDiscounts?.promoCampaignMinutesUsed ?? null,
      appliedMembershipFreeMinutes: prices?.appliedDiscounts?.membershipFreeMinutesUsed ?? null,
      amountOfAppliedDiscountByMembershipMinutes: prices?.appliedDiscounts?.membershipFreeMinutes ?? null,
      amountOfAppliedDiscountByMembershipDiscount: prices?.appliedDiscounts?.membershipDiscount ?? null,
      amountOfAppliedDiscountByPromoCode: prices?.appliedDiscounts?.promoCampaignDiscount ?? null,
      payment,
    };
  }
}
