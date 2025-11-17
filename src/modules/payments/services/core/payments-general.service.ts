import { BadRequestException, Injectable } from "@nestjs/common";
import { PaymentsQueryOptionsService } from "src/modules/payments/services";
import {
  DownloadReceiptDto,
  GetIndividualPaymentsDto,
  MakeManualCaptureAndTransferDto,
} from "src/modules/payments/common/dto";
import { IGetIndividualPaymentOutput, IGetIndividualPaymentsListOutput } from "src/modules/payments/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
  DUE_PAYMENT_STATUSES,
} from "src/common/constants";
import { findManyAndCountQueryBuilderTyped, findOneOrFailTyped, isInRoles, round2 } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments/entities";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { EPaymentReceiptType, EPaymentsErrorCodes } from "src/modules/payments/common/enums/core";
import { format } from "date-fns";
import { TGetIndividualPaymentsQueryBuilder } from "src/modules/payments/common/types/core";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { RedisService } from "src/modules/redis/services";
import { EQueueType } from "src/modules/queues/common/enums";

@Injectable()
export class PaymentsGeneralService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly paymentsQueryOptionsService: PaymentsQueryOptionsService,
    private readonly awsS3Service: AwsS3Service,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly redisService: RedisService,
  ) {}

  // TODO: refactor getters
  public async getIndividualPaymentsList(
    dto: GetIndividualPaymentsDto,
    user: ITokenUserData,
  ): Promise<IGetIndividualPaymentsListOutput> {
    let operatedByCompanyId: string | null = null;

    if (
      isInRoles(
        [...CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES, ...CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES],
        user.role,
      )
    ) {
      const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
        select: { operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });
      operatedByCompanyId = userRole.operatedByCompanyId;
    }

    const queryBuilder = this.paymentRepository.createQueryBuilder("payment");
    this.paymentsQueryOptionsService.getIndividualPaymentsListOptions(queryBuilder, dto, user, operatedByCompanyId);
    const [payments, count] =
      await findManyAndCountQueryBuilderTyped<TGetIndividualPaymentsQueryBuilder[]>(queryBuilder);

    const result: IGetIndividualPaymentOutput[] = [];

    for (const payment of payments) {
      let amount = payment.totalFullAmount;
      let appointmentDate: string | null = null;
      let dueDate: string | null = null;

      if (dto.receiptType && dto.receiptType === EPaymentReceiptType.TAX_INVOICE) {
        amount = payment.totalGstAmount;
      }

      if (payment.appointment?.businessStartTime) {
        appointmentDate = format(payment.appointment.businessStartTime, "dd MMM yyyy");
      } else if (payment.appointment?.scheduledStartTime) {
        appointmentDate = format(payment.appointment.scheduledStartTime, "dd MMM yyyy");
      }

      if (payment.items && payment.items.length > 0 && DUE_PAYMENT_STATUSES.includes(payment.items[0].status)) {
        dueDate = format(payment.items[0].updatingDate, "dd MMM yyyy");
      }

      result.push({
        invoiceNumber: payment.platformId,
        appointmentDate,
        dueDate,
        amount: `${round2(Number(amount))} ${payment.currency}`,
        status: payment.items[0]?.status,
        paymentMethod: payment.paymentMethodInfo,
        internalReceiptKey: payment.receipt,
        taxInvoiceKey: payment.taxInvoice,
      });
    }

    return { data: result, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async downloadReceipt(dto: DownloadReceiptDto): Promise<string> {
    const queryOptions = this.paymentsQueryOptionsService.downloadReceiptOptions(dto.receiptKey);
    const paymentExist = await this.paymentRepository.exists(queryOptions);

    if (!paymentExist) {
      throw new BadRequestException(EPaymentsErrorCodes.RECEIPT_NOT_EXIST);
    }

    const receiptLink = await this.awsS3Service.getShortLivedSignedUrl(dto.receiptKey);

    return receiptLink;
  }

  public async makeManualCaptureAndTransfer(dto: MakeManualCaptureAndTransferDto): Promise<void> {
    const paymentAnalysisKey = `bull:${EQueueType.PAYMENTS_ANALYSIS_QUEUE}:payment-operation:${EPaymentOperation.CAPTURE_PAYMENT}:${dto.appointmentId}`;
    const paymentExecutionKey = `bull:${EQueueType.PAYMENTS_EXECUTION_QUEUE}:payment-execution:${EPaymentOperation.CAPTURE_PAYMENT}:${dto.appointmentId}`;

    await this.redisService.del(paymentAnalysisKey);
    await this.redisService.del(paymentExecutionKey);
    await this.queueInitializeService.addProcessPaymentOperationQueue(
      dto.appointmentId,
      EPaymentOperation.CAPTURE_PAYMENT,
      { isSecondAttempt: true },
    );
  }
}
