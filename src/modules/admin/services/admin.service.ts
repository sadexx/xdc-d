import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
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
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import { findOneOrFailTyped, round2 } from "src/common/utils";
import { format } from "date-fns";
import { IGetUserPayment } from "src/modules/admin/common/interfaces";
import { OldEPaymentStatus, OldEReceiptType } from "src/modules/payments/common/enums";
import { IAccountRequiredStepsDataOutput } from "src/modules/account-activation/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAdminErrorCodes } from "src/modules/admin/common/enums";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(OldPaymentItem)
    private readonly paymentItemRepository: Repository<OldPaymentItem>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly adminQueryOptionsService: AdminQueryOptionsService,
    private readonly accountActivationService: AccountActivationService,
    private readonly accessControlService: AccessControlService,
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
    const [payments, totalCount] = await queryBuilder.getManyAndCount();

    const result: IGetUserPayment[] = [];

    for (const payment of payments) {
      let amount = payment.totalFullAmount;
      let appointmentDate: string | null = null;
      let dueDate: string | null = null;
      let invoiceNumber: string | undefined = payment?.appointment?.platformId;

      if (dto.receiptType && dto.receiptType === OldEReceiptType.TAX_INVOICE) {
        amount = payment.totalGstAmount;
      }

      if (payment.appointment?.scheduledStartTime) {
        appointmentDate = format(payment.appointment.scheduledStartTime, "dd MMM yyyy");
      }

      if (payment.items && payment.items.length > 0 && DUE_PAYMENT_STATUSES.includes(payment.items[0].status)) {
        dueDate = format(payment.items[0].updatingDate, "dd MMM yyyy");
      }

      if (payment.membershipId && payment.fromClient) {
        invoiceNumber = `${payment.fromClient.user.platformId}-${payment.platformId}`;
      }

      if (payment.isDepositCharge && payment.company) {
        invoiceNumber = `${payment.company.platformId}-${payment.platformId}`;
      }

      const firstItem = payment.items.sort(
        (a, b) => new Date(b.updatingDate).getTime() - new Date(a.updatingDate).getTime(),
      )[0];

      result.push({
        id: payment.id,
        invoiceNumber,
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
    const payment = await findOneOrFailTyped<OldPayment>(paymentId, this.paymentRepository, {
      select: {
        id: true,
        items: { id: true, amount: true, gstAmount: true, fullAmount: true, status: true },
        appointment: { id: true },
      },
      where: { id: paymentId },
      relations: { items: true, appointment: true },
    });

    const failedItems = payment.items.filter(
      (item) =>
        item.status === OldEPaymentStatus.AUTHORIZATION_FAILED || item.status === OldEPaymentStatus.CAPTURE_FAILED,
    );

    if (failedItems.length === 0) {
      throw new BadRequestException(EAdminErrorCodes.INCORRECT_PAYMENT_STATUS);
    }

    const failedItemIds = failedItems.map((item) => item.id);

    await this.paymentItemRepository.update(
      { id: In(failedItemIds) },
      { status: dto.status, note: `Manually changed from failed to ${dto.status} by admin.` },
    );

    const capturedOrAuthorized = payment.items.filter(
      (item) =>
        item.status === OldEPaymentStatus.CAPTURED ||
        item.status === OldEPaymentStatus.AUTHORIZED ||
        failedItemIds.includes(item.id),
    );

    let totalAmount = 0;
    let totalGstAmount = 0;
    let totalFullAmount = 0;

    for (const item of capturedOrAuthorized) {
      totalAmount += Number(item.amount);
      totalGstAmount += Number(item.gstAmount);
      totalFullAmount += Number(item.fullAmount);
    }

    await this.paymentRepository.update(
      { id: payment.id },
      {
        totalAmount: round2(totalAmount),
        totalGstAmount: round2(totalGstAmount),
        totalFullAmount: round2(totalFullAmount),
      },
    );

    if (payment.appointment) {
      await this.appointmentRepository.update(
        { id: payment.appointment.id },
        { paidByClient: round2(totalFullAmount) },
      );
    }
  }
}
