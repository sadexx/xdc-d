import { BadRequestException, Injectable } from "@nestjs/common";
import { PaymentsQueryOptionsService } from "src/modules/payments/services";
import {
  DownloadReceiptDto,
  GetIndividualPaymentsDto,
  MakeManualCaptureAndTransferDto,
} from "src/modules/payments/common/dto";
import { IGetIndividualPaymentsListOutput } from "src/modules/payments/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
} from "src/common/constants";
import { findManyAndCountQueryBuilderTyped, findOneOrFailTyped, isInRoles } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments/entities";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { EPaymentsErrorCodes } from "src/modules/payments/common/enums/core";
import { TGetIndividualPayments } from "src/modules/payments/common/types/core";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { QueueInitializeService, QueueManagementService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
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
    private readonly queueManagementService: QueueManagementService,
  ) {}

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
    const [payments, count] = await findManyAndCountQueryBuilderTyped<TGetIndividualPayments[]>(queryBuilder);

    return { data: payments, total: count, limit: dto.limit, offset: dto.offset };
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
    const analysisJobId = `payment-operation:${EPaymentOperation.CAPTURE_PAYMENT}:${dto.appointmentId}`;
    const executionJobId = `payment-execution:${EPaymentOperation.CAPTURE_PAYMENT}:${dto.appointmentId}`;

    await this.queueManagementService.removeJob(EQueueType.PAYMENTS_ANALYSIS_QUEUE, analysisJobId);
    await this.queueManagementService.removeJob(EQueueType.PAYMENTS_EXECUTION_QUEUE, executionJobId);

    await this.queueInitializeService.addProcessPaymentOperationQueue(
      dto.appointmentId,
      EPaymentOperation.CAPTURE_PAYMENT,
      { isSecondAttempt: true },
    );
  }
}
