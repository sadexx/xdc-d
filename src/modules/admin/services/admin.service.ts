import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import {
  GetUserDocumentsDto,
  GetUserInterpreterProfileDto,
  GetUserPaymentsDto,
  GetUsersDto,
  GetUserStepsDto,
  UpdatePaymentStatusDto,
} from "src/modules/admin/common/dto";
import { AccountActivationService } from "src/modules/account-activation/services";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { AdminQueryOptionsService } from "src/modules/admin/services";
import {
  GetUserDocumentsOutput,
  GetUserProfileOutput,
  GetUsersOutput,
  IGetUserPaymentResponseOutput,
} from "src/modules/admin/common/output";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { DUE_PAYMENT_STATUSES } from "src/common/constants";
import {
  findManyAndCountQueryBuilderTyped,
  findOneOrFailTyped,
  formatDecimalString,
  parseDecimalNumber,
  round2,
} from "src/common/utils";
import { format } from "date-fns";
import { IGetUserPayment } from "src/modules/admin/common/interfaces";
import { IAccountRequiredStepsDataOutput } from "src/modules/account-activation/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAdminErrorCodes } from "src/modules/admin/common/enums";
import { TGetUserPayments, TLoadPaymentForStatusChange, TPaymentForStatusChange } from "src/modules/admin/common/types";
import { Payment } from "src/modules/payments/entities";
import { EPaymentReceiptType, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { PaymentsManagementService } from "src/modules/payments/services";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly adminQueryOptionsService: AdminQueryOptionsService,
    private readonly accountActivationService: AccountActivationService,
    private readonly accessControlService: AccessControlService,
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly dataSource: DataSource,
  ) {}

  public async getUsers(dto: GetUsersDto): Promise<GetUsersOutput> {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    this.adminQueryOptionsService.getUsersOptions(queryBuilder, dto);

    const [users, count] = await queryBuilder.getManyAndCount();

    return { data: users, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getUserDocuments(dto: GetUserDocumentsDto): Promise<GetUserDocumentsOutput> {
    const queryOptions = this.adminQueryOptionsService.getUserDocumentsOptions(dto);
    const userDocs = await findOneOrFailTyped<UserRole>(dto.id, this.userRoleRepository, queryOptions);

    return { documents: userDocs };
  }

  public async getUserProfile(userRoleId: string): Promise<GetUserProfileOutput> {
    const queryOptions = this.adminQueryOptionsService.getUserProfileOptions(userRoleId);
    const userProfile = await findOneOrFailTyped<UserRole>(userRoleId, this.userRoleRepository, queryOptions);

    return { profile: userProfile };
  }

  public async getUserSteps(dto: GetUserStepsDto, user: ITokenUserData): Promise<IAccountRequiredStepsDataOutput> {
    const { userRole, accountActivationSteps } =
      await this.accountActivationService.fetchUserAndEvaluateRequiredAndActivationSteps(dto.id, dto.userRole);

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    return accountActivationSteps;
  }

  public async getUserInterpreterProfile(dto: GetUserInterpreterProfileDto): Promise<InterpreterProfile | null> {
    const interpreterProfile = await this.interpreterProfileRepository.findOne({
      where: { userRole: { userId: dto.id, role: { name: dto.userRole } } },
      relations: { cancellationRecord: true },
    });

    return interpreterProfile;
  }

  public async getUserPayments(dto: GetUserPaymentsDto): Promise<IGetUserPaymentResponseOutput> {
    const queryBuilder = this.paymentRepository.createQueryBuilder("payment");
    this.adminQueryOptionsService.getUserPaymentsOptions(queryBuilder, dto);
    const [payments, totalCount] = await findManyAndCountQueryBuilderTyped<TGetUserPayments[]>(queryBuilder);

    const result: IGetUserPayment[] = [];

    for (const payment of payments) {
      let amount = payment.totalFullAmount;
      let appointmentDate: string | null = null;
      let dueDate: string | null = null;

      if (dto.receiptType && dto.receiptType === EPaymentReceiptType.TAX_INVOICE) {
        amount = payment.totalGstAmount;
      }

      if (payment.appointment?.scheduledStartTime) {
        appointmentDate = format(payment.appointment.scheduledStartTime, "dd MMM yyyy");
      }

      if (payment.items && payment.items.length > 0 && DUE_PAYMENT_STATUSES.includes(payment.items[0].status)) {
        dueDate = format(payment.items[0].updatingDate, "dd MMM yyyy");
      }

      const firstItem = payment.items.sort(
        (a, b) => new Date(b.updatingDate).getTime() - new Date(a.updatingDate).getTime(),
      )[0];

      result.push({
        id: payment.id,
        invoiceNumber: payment.platformId,
        appointmentDate,
        dueDate,
        amount: `${round2(Number(amount))} ${payment.currency}`,
        status: firstItem?.status,
        paymentMethod: payment.paymentMethodInfo,
        internalReceiptKey: payment.receipt,
        taxInvoiceKey: payment.taxInvoice,
        note: payment.note,
        items: payment.items,
      });
    }

    return { data: result, total: totalCount, limit: dto.limit, offset: dto.offset };
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
}
