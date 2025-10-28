import { BadRequestException, Injectable } from "@nestjs/common";
import { OldDownloadReceiptDto } from "src/modules/payments/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { OldIncomingPaymentsWaitList, OldPayment } from "src/modules/payments/entities";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import {
  OldICalculateAppointmentPrices,
  OldIGetIndividualPayment,
  OldIIsGstPayers,
} from "src/modules/payments/common/interfaces";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { OldRatesService } from "src/modules/rates-old/services";
import { findOneOrFail, isInRoles, round2 } from "src/common/utils";
import { UserRole } from "src/modules/users/entities";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { addMinutes, differenceInDays, differenceInMinutes, format } from "date-fns";
import {
  EOldPaymentsErrorCodes,
  OldECurrencies,
  OldEPayInStatus,
  OldEPaymentDirection,
  OldEPaymentFailedReason,
  OldEPaymentStatus,
  OldEReceiptType,
  OldERoleType,
} from "src/modules/payments/common/enums";
import { OldIndividualPaymentsService } from "src/modules/payments/services/old-individual-payments.service";
import {
  OLD_MIN_NUM_DAYS_BEFORE_APPOINTMENT_TO_PAY,
  OLD_MINUTES_BEFORE_START_AS_REASON_TO_CANCEL,
} from "src/modules/payments/common/constants/old-constants";
import { HelperService } from "src/modules/helper/services";
import { LokiLogger } from "src/common/logger";
import {
  CORPORATE_CLIENT_ROLES,
  CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
  UNDEFINED_VALUE,
  DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN,
  DUE_PAYMENT_STATUSES,
  GST_COEFFICIENT,
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
} from "src/common/constants";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { NotificationService } from "src/modules/notifications/services";
import { OldMakeManualPayoutAttemptDto } from "src/modules/payments/common/dto/old-make-manual-payout-attempt.dto";
import { EUserRoleName } from "src/modules/users/common/enums";
import { OldPaymentsQueryOptionsService } from "src/modules/payments/services/old-payments-query-options.service";
import { OldCorporatePaymentsService } from "src/modules/payments/services/old-corporate-payments.service";
import { Company } from "src/modules/companies/entities";
import { OldGetIndividualPaymentsDto } from "src/modules/payments/common/dto/old-get-individual-payments.dto";
import { OldPaymentsHelperService } from "src/modules/payments/services/old-payments-helper.service";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { OldIGetIndividualPaymentResponseOutput } from "src/modules/payments/common/outputs";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { AccessControlService } from "src/modules/access-control/services";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { TMakePayInAuthByAdditionalBlockAppointment } from "src/modules/payments/common/types";

@Injectable()
export class OldGeneralPaymentsService {
  private readonly lokiLogger = new LokiLogger(OldGeneralPaymentsService.name);

  public constructor(
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(OldIncomingPaymentsWaitList)
    private readonly incomingPaymentWaitListRepository: Repository<OldIncomingPaymentsWaitList>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
    private readonly ratesService: OldRatesService,
    private readonly individualPaymentsService: OldIndividualPaymentsService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
    private readonly notificationService: NotificationService,
    private readonly paymentsQueryOptionsService: OldPaymentsQueryOptionsService,
    private readonly corporatePaymentsService: OldCorporatePaymentsService,
    private readonly paymentsHelperService: OldPaymentsHelperService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async makePayInAuth(
    appointment: Appointment,
    pricesOfAppointment?: OldICalculateAppointmentPrices,
    isShortTimeSlot?: boolean,
  ): Promise<OldEPayInStatus> {
    if (!appointment.clientId) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      return OldEPayInStatus.INCORRECT_DATA;
    }

    const clientUserRole = await findOneOrFail(appointment.clientId, this.userRoleRepository, {
      where: { id: appointment.clientId },
      relations: { role: true },
    });

    let isCorporate: boolean = false;
    let company: Company | null = null;
    let country = clientUserRole.country;

    if (isInRoles(CORPORATE_CLIENT_ROLES, clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(clientUserRole.operatedByCompanyId, this.companyRepository, {
        where: { id: clientUserRole.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;
    }

    if (!country) {
      throw new BadRequestException(EOldPaymentsErrorCodes.COUNTRY_NOT_FILLED);
    }

    let date: Date | undefined;

    if (appointment.businessStartTime) {
      date = new Date(appointment.businessStartTime);
    } else {
      date = new Date(appointment.scheduledStartTime);
    }

    if (!isCorporate) {
      const daysBeforeAppointment = differenceInDays(date, new Date());

      if (daysBeforeAppointment > OLD_MIN_NUM_DAYS_BEFORE_APPOINTMENT_TO_PAY) {
        await this.paymentsHelperService.redirectPaymentToWaitList(appointment);

        await this.paymentsHelperService.changeAppointmentStatusToPending(appointment.id);

        return OldEPayInStatus.REDIRECTED_TO_WAIT_LIST;
      }
    }

    if (!pricesOfAppointment) {
      pricesOfAppointment = await this.paymentsHelperService.calculateAppointmentPrice(
        appointment,
        date,
        isCorporate,
        country,
      );
    }

    let authStatus: OldEPayInStatus | undefined;

    if (isCorporate) {
      if (!company) {
        throw new BadRequestException(EOldPaymentsErrorCodes.COMPANY_NOT_FOUND);
      }

      await this.corporatePaymentsService.chargeFromDeposit(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        pricesOfAppointment.discounts ?? null,
        pricesOfAppointment.discountByMembershipMinutes,
        pricesOfAppointment.discountByMembershipDiscount,
        pricesOfAppointment.discountByPromoCode,
        company,
        OldECurrencies.AUD,
      );
    } else {
      authStatus = await this.individualPaymentsService.authorizePayment(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        OldECurrencies.AUD,
        false,
        isShortTimeSlot,
      );
    }

    if (
      !authStatus ||
      authStatus === OldEPayInStatus.REDIRECTED_TO_WAIT_LIST ||
      authStatus === OldEPayInStatus.AUTHORIZATION_SUCCESS
    ) {
      await this.paymentsHelperService.changeAppointmentStatusToPending(appointment.id);
    }

    return authStatus || OldEPayInStatus.AUTHORIZATION_SUCCESS;
  }

  public async makePayInAuthIfAppointmentRecreated(
    newAppointment: Appointment,
    oldAppointment: Appointment,
  ): Promise<OldEPayInStatus> {
    if (
      oldAppointment.id === newAppointment.id &&
      oldAppointment.schedulingDurationMin === newAppointment.schedulingDurationMin &&
      oldAppointment.topic === newAppointment.topic &&
      oldAppointment.scheduledStartTime === newAppointment.scheduledStartTime &&
      oldAppointment.interpretingType === newAppointment.interpretingType &&
      oldAppointment.schedulingType === newAppointment.schedulingType &&
      oldAppointment.interpreterType === newAppointment.interpreterType &&
      oldAppointment.communicationType === newAppointment.communicationType
    ) {
      return OldEPayInStatus.PAY_IN_NOT_CHANGED;
    }

    if (!newAppointment.clientId || !newAppointment.client) {
      this.lokiLogger.error(
        `Appointment with id ${newAppointment.id} does not have clientId (${newAppointment.clientId})`,
      );

      return OldEPayInStatus.INCORRECT_DATA;
    }

    const clientUserRole = await findOneOrFail(newAppointment.clientId, this.userRoleRepository, {
      where: { id: newAppointment.clientId },
      relations: { role: true },
    });

    const oldAppointmentPayment = await this.paymentRepository.findOne({
      where: { appointment: { id: oldAppointment.id }, direction: OldEPaymentDirection.INCOMING },
    });

    let date: Date | undefined;

    if (newAppointment.businessStartTime) {
      date = new Date(newAppointment.businessStartTime);
    } else {
      date = new Date(newAppointment.scheduledStartTime);
    }

    let isCorporate: boolean = false;
    let company: Company | null = null;
    let country = clientUserRole.country;

    if (isInRoles(CORPORATE_CLIENT_ROLES, clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(newAppointment.client.operatedByCompanyId, this.companyRepository, {
        where: { id: newAppointment.client.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;
    }

    if (!country) {
      throw new BadRequestException(EOldPaymentsErrorCodes.COUNTRY_NOT_FILLED);
    }

    const pricesOfAppointment = await this.paymentsHelperService.calculateAppointmentPrice(
      newAppointment,
      date,
      isCorporate,
      country,
    );

    if (oldAppointmentPayment) {
      if (
        oldAppointmentPayment.totalAmount === pricesOfAppointment.amount &&
        oldAppointmentPayment.totalGstAmount === pricesOfAppointment.gstAmount
      ) {
        await this.paymentRepository.update({ id: oldAppointmentPayment.id }, { appointment: newAppointment });

        return OldEPayInStatus.PAY_IN_REATTACHED;
      } else {
        if (isCorporate) {
          if (!company) {
            throw new BadRequestException(EOldPaymentsErrorCodes.COMPANY_NOT_FOUND);
          }

          await this.corporatePaymentsService.cancelAuthorization(oldAppointment.id, company);
        } else {
          await this.individualPaymentsService.cancelAuthorization(oldAppointment.id);
        }
      }
    }

    return await this.makePayInAuth(newAppointment, pricesOfAppointment);
  }

  public async cancelPayInAuth(appointment: Appointment, isCancelByClient?: boolean): Promise<void> {
    const isRestricted = this.appointmentSharedService.isAppointmentCancellationRestrictedByTimeLimits(appointment);

    if (!appointment.clientId) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      throw new BadRequestException(EOldPaymentsErrorCodes.INCORRECT_DATA);
    }

    const clientUserRole = await findOneOrFail(appointment.clientId, this.userRoleRepository, {
      where: { id: appointment.clientId },
      relations: { role: true },
    });

    let isCorporate: boolean = false;
    let company: Company | null = null;

    if (isInRoles(CORPORATE_CLIENT_ROLES, clientUserRole.role.name)) {
      isCorporate = true;
      const isCorporateClientProvider = clientUserRole.operatedByMainCorporateCompanyId !== null;
      const companyId = isCorporateClientProvider
        ? (clientUserRole.operatedByMainCorporateCompanyId as string)
        : clientUserRole.operatedByCompanyId;

      company = await findOneOrFail(companyId, this.companyRepository, {
        where: { id: companyId },
        relations: { paymentInformation: true },
      });
    }

    if (isCancelByClient && isRestricted) {
      await this.paymentRepository.update(
        { appointment: { id: appointment.id }, direction: OldEPaymentDirection.INCOMING },
        {
          note: "Appointment cancelled by client less than 12 hours to appointment start date",
        },
      );

      await this.makePayInCaptureAndPayOut(appointment.id);

      return;
    }

    if (isCorporate) {
      if (!company) {
        throw new BadRequestException(EOldPaymentsErrorCodes.COMPANY_NOT_FOUND);
      }

      return await this.corporatePaymentsService.cancelAuthorization(appointment.id, company);
    } else {
      return await this.individualPaymentsService.cancelAuthorization(appointment.id);
    }
  }

  public async cancelPayInAuthForGroup(appointments: Appointment[]): Promise<void> {
    const appointmentIds = appointments.map((appointment) => appointment.id);

    const payments = await this.paymentRepository.find({
      where: { appointment: { id: In(appointmentIds) } },
      relations: { items: true },
      select: {
        id: true,
        appointment: { id: true, status: true, scheduledStartTime: true, communicationType: true, creationDate: true },
        items: { status: true },
      },
    });

    for (const payment of payments) {
      const isPaymentHaveAtLeastOneAuthorizedItem = payment.items.some(
        (item) => item.status === OldEPaymentStatus.AUTHORIZED,
      );

      if (isPaymentHaveAtLeastOneAuthorizedItem) {
        if (payment.appointment) {
          await this.cancelPayInAuth(payment.appointment);
        }
      }
    }
  }

  public async makePayInAuthByAdditionalBlock(
    appointment: TMakePayInAuthByAdditionalBlockAppointment,
    additionalBlockDuration: number,
    extensionPeriodStart?: Date,
    discounts?: IDiscountRate,
  ): Promise<OldEPayInStatus> {
    if (!appointment.clientId) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      return OldEPayInStatus.INCORRECT_DATA;
    }

    const clientUserRole = await findOneOrFail(appointment.clientId, this.userRoleRepository, {
      where: { id: appointment.clientId },
      relations: { role: true },
    });

    if (!extensionPeriodStart) {
      throw new BadRequestException(EOldPaymentsErrorCodes.INCORRECT_DATA);
    }

    const date = new Date(extensionPeriodStart);

    let isCorporate: boolean = false;
    let company: Company | null = null;
    let country = clientUserRole.country;

    if (isInRoles(CORPORATE_CLIENT_ROLES, clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(clientUserRole.operatedByCompanyId, this.companyRepository, {
        where: { id: clientUserRole.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;
    }

    if (!country) {
      throw new BadRequestException(EOldPaymentsErrorCodes.COUNTRY_NOT_FILLED);
    }

    const pricesOfAppointment = await this.paymentsHelperService.calculateAppointmentPrice(
      appointment,
      date,
      isCorporate,
      country,
      additionalBlockDuration,
      true,
      discounts,
    );

    if (isCorporate) {
      if (!company) {
        throw new BadRequestException(EOldPaymentsErrorCodes.COMPANY_NOT_FOUND);
      }

      await this.corporatePaymentsService.chargeFromDeposit(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        pricesOfAppointment.discounts ?? null,
        pricesOfAppointment.discountByMembershipMinutes,
        pricesOfAppointment.discountByMembershipDiscount,
        pricesOfAppointment.discountByPromoCode,
        company,
        OldECurrencies.AUD,
      );
    } else {
      await this.individualPaymentsService.authorizePayment(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        OldECurrencies.AUD,
        true,
      );
    }

    return OldEPayInStatus.AUTHORIZATION_SUCCESS;
  }

  public async downloadReceipt(dto: OldDownloadReceiptDto): Promise<string> {
    const paymentExist = await this.paymentRepository.exists({
      where: [{ receipt: dto.receiptKey }, { taxInvoice: dto.receiptKey }, { items: { receipt: dto.receiptKey } }],
    });

    if (!paymentExist) {
      throw new BadRequestException(EOldPaymentsErrorCodes.RECEIPT_NOT_EXIST);
    }

    const receiptLink = await this.awsS3Service.getShortLivedSignedUrl(dto.receiptKey);

    return receiptLink;
  }

  public async makeManualPayInCaptureAndPayOut(dto: OldMakeManualPayoutAttemptDto): Promise<void> {
    return await this.makePayInCaptureAndPayOut(dto.appointmentId, true);
  }

  public async makePayInCaptureAndPayOut(appointmentId: string, isSecondAttempt: boolean = false): Promise<void> {
    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, {
      where: { id: appointmentId },
      relations: {
        client: {
          profile: true,
          role: true,
        },
        interpreter: {
          paymentInformation: true,
          profile: true,
          role: true,
        },
      },
    });

    if (!appointment.clientId || !appointment.client) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      throw new BadRequestException(EOldPaymentsErrorCodes.INCORRECT_DATA);
    }

    let isCorporateClient: boolean = false;

    if (isInRoles(CORPORATE_CLIENT_ROLES, appointment.client.role.name)) {
      isCorporateClient = true;
    }

    if (isCorporateClient) {
      if (appointment.client.operatedByMainCorporateCompanyId === appointment.interpreter?.operatedByCompanyId) {
        await this.corporatePaymentsService.processSameCompanyCommission(appointment);
      } else {
        await this.corporatePaymentsService.capturePayment(appointment, isSecondAttempt);
      }
    } else {
      await this.individualPaymentsService.capturePayment(appointment, isSecondAttempt);
    }

    if (!appointment.interpreterId) {
      const appointmentAdminInfo = await findOneOrFail(
        appointment.id,
        this.appointmentAdminInfoRepository,
        {
          where: { appointment: { id: appointment.id } },
        },
        "appointment.id",
      );

      if (appointmentAdminInfo.isInterpreterFound) {
        return;
      }

      this.lokiLogger.error(
        `Appointment with id ${appointment.id} does not have interpreter (${appointment.interpreterId})`,
      );

      return;
    }

    let date: Date | undefined;

    if (appointment.businessStartTime) {
      date = new Date(appointment.businessStartTime);
    } else {
      date = new Date(appointment.scheduledStartTime);
    }

    const scheduleDateTime = date.toISOString();

    const interpreterUserRole = await findOneOrFail(appointment.interpreterId, this.userRoleRepository, {
      where: { id: appointment.interpreterId },
      relations: { role: true, abnCheck: true, paymentInformation: true },
    });

    let isCorporateInterpreter: boolean = false;
    let company: Company | null = null;
    let country: EExtCountry | null = null;

    if (
      appointment.interpreter &&
      appointment.interpreter.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      isCorporateInterpreter = true;
      company = await findOneOrFail(appointment.interpreter.operatedByCompanyId, this.companyRepository, {
        where: { id: appointment.interpreter.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;

      if (!country) {
        throw new BadRequestException(EOldPaymentsErrorCodes.COUNTRY_NOT_FILLED);
      }
    }

    let isGstPayers: OldIIsGstPayers | null = null;

    if (isCorporateInterpreter) {
      isGstPayers = this.helperService.isCorporateGstPayer(null, country);
    } else {
      isGstPayers = this.helperService.isIndividualGstPayer(null, interpreterUserRole?.abnCheck?.gstFromClient);
    }

    let duration = appointment.schedulingDurationMin;

    if (appointment.businessEndTime && appointment.businessStartTime) {
      duration = differenceInMinutes(new Date(appointment.businessEndTime), new Date(appointment.businessStartTime));
    }

    const price = await this.ratesService.calculatePriceByOneDay(
      {
        interpreterType: appointment.interpreterType,
        schedulingType: appointment.schedulingType,
        communicationType: appointment.communicationType,
        interpretingType: appointment.interpretingType,
        topic: appointment.topic,
        duration,
        scheduleDateTime,
        extraDays: [],
        interpreterTimezone: interpreterUserRole.timezone,
      },
      duration,
      scheduleDateTime,
      isGstPayers.interpreter,
      OldERoleType.INTERPRETER,
    );

    let fullAmount = price.price;

    if (
      interpreterUserRole.role.name === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      interpreterUserRole.country === EExtCountry.AUSTRALIA &&
      (!interpreterUserRole.abnCheck ||
        (interpreterUserRole.abnCheck && interpreterUserRole.abnCheck.abnStatus !== EExtAbnStatus.ACTIVE))
    ) {
      fullAmount = round2(fullAmount / DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN);
    }

    let amount = round2(fullAmount);
    let gstAmount = 0;

    if (isGstPayers.interpreter) {
      amount = round2(fullAmount / GST_COEFFICIENT);
      gstAmount = round2(fullAmount - amount);
    }

    if (isCorporateInterpreter) {
      if (!company) {
        throw new BadRequestException(EOldPaymentsErrorCodes.CORPORATE_INTERPRETER_NO_COMPANY);
      }

      await this.corporatePaymentsService.makeRecordToPayoutWaitingList(
        appointment,
        company,
        fullAmount,
        amount,
        gstAmount,
      );
    } else {
      await this.individualPaymentsService.makeTransferAndPayout(amount, gstAmount, appointment, isSecondAttempt);
    }
  }

  public async checkPaymentWaitList(): Promise<void> {
    const getFindWaitListWhereOptions = this.paymentsHelperService.getFindWaitListWhere();

    const paymentsInWaitList = await this.incomingPaymentWaitListRepository.find({
      where: getFindWaitListWhereOptions,
      select: {
        id: true,
        appointment: {
          id: true,
          clientId: true,
          interpreterId: true,
          businessStartTime: true,
          scheduledStartTime: true,
          schedulingDurationMin: true,
          interpreterType: true,
          schedulingType: true,
          communicationType: true,
          interpretingType: true,
          topic: true,
          acceptOvertimeRates: true,
        },
        paymentAttemptCount: true,
        isShortTimeSlot: true,
        updatingDate: true,
      },
    });

    const waitListItemsIdWithSuccessfulAuth: string[] = [];

    for (const paymentInWaitList of paymentsInWaitList) {
      if (
        new Date(paymentInWaitList.appointment.scheduledStartTime) <=
        addMinutes(new Date(), OLD_MINUTES_BEFORE_START_AS_REASON_TO_CANCEL)
      ) {
        await this.incomingPaymentWaitListRepository.delete({ id: paymentInWaitList.id });

        await this.appointmentFailedPaymentCancelService
          .cancelAppointmentPaymentFailed(paymentInWaitList.appointment.id)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to cancel payin auth: ${error.message}, appointmentId: ${paymentInWaitList.appointment.id}`,
              error.stack,
            );
          });

        continue;
      }

      if (
        paymentInWaitList.isShortTimeSlot &&
        differenceInMinutes(new Date(), paymentInWaitList.updatingDate) < NUMBER_OF_MINUTES_IN_HALF_HOUR
      ) {
        continue;
      }

      const paymentStatus = await this.makePayInAuth(
        paymentInWaitList.appointment,
        UNDEFINED_VALUE,
        paymentInWaitList.isShortTimeSlot,
      ).catch(async (error: Error) => {
        this.lokiLogger.error(
          `Failed to make payin: ${error.message}, appointmentId: ${paymentInWaitList.appointment.id}`,
          error.stack,
        );

        return OldEPayInStatus.AUTHORIZATION_FAILED;
      });

      if (paymentStatus === OldEPayInStatus.AUTHORIZATION_SUCCESS) {
        waitListItemsIdWithSuccessfulAuth.push(paymentInWaitList.id);
      } else {
        await this.incomingPaymentWaitListRepository.update(
          { id: paymentInWaitList.id },
          { paymentAttemptCount: paymentInWaitList.paymentAttemptCount + 1 },
        );

        if (paymentInWaitList.appointment.clientId) {
          await this.notificationService.sendAppointmentAuthorizationPaymentFailedNotification(
            paymentInWaitList.appointment.clientId,
            paymentInWaitList.appointment.platformId,
            OldEPaymentFailedReason.AUTH_FAILED,
            { appointmentId: paymentInWaitList.appointment.id },
          );
        }
      }
    }

    await this.incomingPaymentWaitListRepository.delete({ id: In(waitListItemsIdWithSuccessfulAuth) });

    this.lokiLogger.log(
      `Check payment wait list cron. Processed: ${paymentsInWaitList.length} appointments. From them successfully: ${waitListItemsIdWithSuccessfulAuth.length}`,
    );
  }

  public async getIndividualPaymentsList(
    dto: OldGetIndividualPaymentsDto,
    user: ITokenUserData,
  ): Promise<OldIGetIndividualPaymentResponseOutput> {
    let company: Company | null = null;

    if (
      isInRoles(
        [...CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES, ...CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES],
        user.role,
      )
    ) {
      company = await this.accessControlService.getCompanyByRole(user, {});
    }

    const queryBuilder = this.paymentRepository.createQueryBuilder("payment");
    this.paymentsQueryOptionsService.getIndividualPaymentsListOptions(queryBuilder, dto, user, company);
    const [payments, count] = await queryBuilder.getManyAndCount();

    const result: OldIGetIndividualPayment[] = [];

    for (const payment of payments) {
      let amount = payment.totalFullAmount;
      let appointmentDate: string | null = null;
      let dueDate: string | null = null;
      let invoiceNumber: string | undefined = payment?.appointment?.platformId;

      if (dto.receiptType && dto.receiptType === OldEReceiptType.TAX_INVOICE) {
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

      if (payment.membershipId && payment.fromClient) {
        invoiceNumber = `${payment.fromClient.user.platformId}-${payment.platformId}`;
      }

      if (payment.isDepositCharge && payment.company) {
        invoiceNumber = `${payment.company.platformId}-${payment.platformId}`;
      }

      result.push({
        invoiceNumber,
        appointmentDate,
        dueDate,
        amount: `${round2(Number(amount))} ${payment.currency}`,
        status: payment.items[0]?.status,
        paymentMethod: payment.paymentMethodInfo,
        internalReceiptKey: payment.receipt,
        taxInvoiceKey: payment.taxInvoice,
        note: payment.note,
      });
    }

    return { data: result, total: count, limit: dto.limit, offset: dto.offset };
  }
}
