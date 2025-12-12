import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { GetUserPaymentsDto, MarkPaymentsInvoicedDto, UpdatePaymentStatusDto } from "src/modules/admin/common/dto";
import { AdminQueryOptionsService } from "src/modules/admin/services";
import { IGetUserPaymentResponseOutput } from "src/modules/admin/common/output";
import {
  findManyAndCountQueryBuilderTyped,
  findManyTyped,
  findOneOrFailTyped,
  formatDecimalString,
  parseDecimalNumber,
} from "src/common/utils";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAdminErrorCodes } from "src/modules/admin/common/enums";
import {
  TGenerateCorporatePostPaymentReceipt,
  TGenerateCorporatePostPaymentReceiptCompany,
  TGetUserPayments,
  TLoadPaymentForStatusChange,
  TMarkPaymentsInvoiced,
  TMarkPaymentsInvoicedCompany,
  TPaymentForStatusChange,
  TValidatePostPayments,
} from "src/modules/admin/common/types";
import { Payment } from "src/modules/payments/entities";
import { EPaymentStatus, EPaymentSystem } from "src/modules/payments/common/enums/core";
import { PaymentsManagementService } from "src/modules/payments/services";
import { Company } from "src/modules/companies/entities";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly adminQueryOptionsService: AdminQueryOptionsService,
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  public async getUserPayments(dto: GetUserPaymentsDto): Promise<IGetUserPaymentResponseOutput> {
    const queryBuilder = this.paymentRepository.createQueryBuilder("payment");
    this.adminQueryOptionsService.getUserPaymentsOptions(queryBuilder, dto);
    const [payments, totalCount] = await findManyAndCountQueryBuilderTyped<TGetUserPayments[]>(queryBuilder);

    return { data: payments, total: totalCount, limit: dto.limit, offset: dto.offset };
  }

  public async updatePaymentStatus(paymentId: string, dto: UpdatePaymentStatusDto): Promise<void> {
    const payment = await this.loadPaymentForStatusChange(paymentId);

    const failedItems = payment.items.filter(
      (item) => item.status === EPaymentStatus.AUTHORIZATION_FAILED || item.status === EPaymentStatus.CAPTURE_FAILED,
    );

    if (failedItems.length === 0) {
      throw new BadRequestException(EAdminErrorCodes.INCORRECT_PAYMENT_STATUS);
    }

    const failedItemIds = failedItems.map((item) => item.id);
    const successfulItems = payment.items.filter(
      (item) =>
        item.status === EPaymentStatus.CAPTURED ||
        item.status === EPaymentStatus.AUTHORIZED ||
        failedItemIds.includes(item.id),
    );

    await this.dataSource.transaction(async (manager) => {
      await this.updateFailedPaymentItems(manager, failedItemIds, dto.status);
      await this.updatePaymentTotals(manager, payment, successfulItems);
    });
  }

  private async loadPaymentForStatusChange(paymentId: string): Promise<TPaymentForStatusChange> {
    const queryOptions = this.adminQueryOptionsService.loadPaymentForStatusChangeOptions(paymentId);
    const payment = await findOneOrFailTyped<TLoadPaymentForStatusChange>(
      paymentId,
      this.paymentRepository,
      queryOptions,
    );

    return {
      ...payment,
      items: payment.items.map((item) => ({
        ...item,
        amount: parseDecimalNumber(item.amount),
        gstAmount: parseDecimalNumber(item.gstAmount),
        fullAmount: parseDecimalNumber(item.fullAmount),
      })),
    };
  }

  private async updateFailedPaymentItems(
    manager: EntityManager,
    itemIds: string[],
    newStatus: EPaymentStatus,
  ): Promise<void> {
    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: In(itemIds) },
      { status: newStatus, note: `Manually changed from failed to ${newStatus} by admin.` },
    );
  }

  private async updatePaymentTotals(
    manager: EntityManager,
    payment: TPaymentForStatusChange,
    successfulItems: TPaymentForStatusChange["items"],
  ): Promise<void> {
    let totalAmount = 0;
    let totalGstAmount = 0;
    let totalFullAmount = 0;

    for (const item of successfulItems) {
      totalAmount += item.amount;
      totalGstAmount += item.gstAmount;
      totalFullAmount += item.fullAmount;
    }

    await this.paymentsManagementService.updatePayment(
      manager,
      { id: payment.id },
      {
        totalAmount: formatDecimalString(totalAmount),
        totalGstAmount: formatDecimalString(totalGstAmount),
        totalFullAmount: formatDecimalString(totalFullAmount),
      },
    );

    if (payment.appointment) {
      await manager
        .getRepository(Appointment)
        .update({ id: payment.appointment.id }, { paidByClient: formatDecimalString(totalFullAmount) });
    }
  }

  public async markPaymentsInvoiced(dto: MarkPaymentsInvoicedDto): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const queryOptions = this.adminQueryOptionsService.markPaymentsInvoicedOptions(dto.paymentIds, dto.companyId);
      const payments = await findManyTyped<TMarkPaymentsInvoiced[]>(
        manager.getRepository(Payment),
        queryOptions.payments,
      );

      this.validatePostPayments(dto.paymentIds, payments);

      const company = await findOneOrFailTyped<TMarkPaymentsInvoicedCompany>(
        dto.companyId,
        manager.getRepository(Company),
        queryOptions.company,
      );

      await this.paymentsManagementService.updatePaymentItem(
        manager,
        { payment: { id: In(dto.paymentIds) } },
        { status: EPaymentStatus.INVOICED },
      );

      await this.releaseCreditLimit(manager, payments, company);
    });
  }

  private async releaseCreditLimit(
    manager: EntityManager,
    payments: TMarkPaymentsInvoiced[],
    company: TMarkPaymentsInvoicedCompany,
  ): Promise<void> {
    let totalAmountToRelease = 0;
    for (const payment of payments) {
      totalAmountToRelease += parseDecimalNumber(payment.totalFullAmount);
    }

    const currentUsage = parseDecimalNumber(company.depositAmount);
    const newUsage = Math.max(0, currentUsage - totalAmountToRelease);

    await manager.getRepository(Company).update(company.id, {
      depositAmount: formatDecimalString(newUsage),
    });
  }

  public async generateCorporatePostPaymentReceipt(dto: MarkPaymentsInvoicedDto): Promise<void> {
    const queryOptions = this.adminQueryOptionsService.generateCorporatePostPaymentReceiptOptions(
      dto.paymentIds,
      dto.companyId,
    );

    const payments = await findManyTyped<TGenerateCorporatePostPaymentReceipt[]>(
      this.paymentRepository,
      queryOptions.payments,
    );

    this.validatePostPayments(dto.paymentIds, payments);

    const company = await findOneOrFailTyped<TGenerateCorporatePostPaymentReceiptCompany>(
      dto.companyId,
      this.companyRepository,
      queryOptions.company,
    );

    await this.queueInitializeService.addProcessCorporatePostPaymentReceiptGenerationQueue({ payments, company });
  }

  private validatePostPayments(paymentIds: string[], payments: TValidatePostPayments[]): void {
    if (paymentIds.length !== payments.length) {
      throw new BadRequestException(EAdminErrorCodes.POST_PAYMENT_NOT_FOUND);
    }

    for (const payment of payments) {
      if (payment.system !== EPaymentSystem.POST_PAYMENT) {
        throw new BadRequestException(EAdminErrorCodes.POST_PAYMENT_WRONG_SYSTEM);
      }

      const hasPendingPaymentItems = payment.items.some((item) => item.status === EPaymentStatus.PENDING_PAYMENT);

      if (!hasPendingPaymentItems) {
        throw new BadRequestException(EAdminErrorCodes.POST_PAYMENT_NO_PENDING_ITEMS);
      }
    }
  }
}
