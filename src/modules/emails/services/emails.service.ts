import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EUserRoleName } from "src/modules/users/common/enums";
import {
  IPayInReceipt,
  IPayOutReceipt,
  ITaxInvoiceReceipt,
  IDepositChargeReceipt,
  ICorporatePayOutReceipt,
  ICorporateTaxInvoiceReceipt,
  ICorporatePostPaymentReceipt,
} from "src/modules/pdf/common/interfaces";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { format } from "date-fns";
import { CustomMailerService } from "src/modules/emails/custom-mailer/services";
import { INaatiWebScraperReport } from "src/modules/naati/common/interface";
import { EExtIssueState } from "src/modules/backy-check/common/enums";
import { INewCompanyRequestDetails } from "src/modules/companies/common/interfaces";
import { IDepositBalanceInsufficientFund, IDepositBalanceIsLow } from "src/modules/emails/common/interfaces";
import { IDepositChargeFailed } from "src/modules/emails/common/interfaces/deposit-charge-failed.interface";
import { EEmailLayoutName, EEmailTemplateName } from "src/modules/emails/common/enums";
import { IAppointmentParticipantInvitationOutput } from "src/modules/appointments/appointment/common/outputs";
import { CURRENCY_DECIMAL_PLACES } from "src/common/constants";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

@Injectable()
export class EmailsService {
  constructor(
    private readonly mailService: CustomMailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendConfirmationCode(email: string, emailConfirmationCode: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Email Verification`,
      templateName: EEmailTemplateName.CONFIRMATION_CODE,
      context: {
        title: "Email Verification",
        code: emailConfirmationCode,
        codeDuration: this.configService.getOrThrow<number>("redis.ttlMinutes"),
      },
    });

    return `Code send to the ${email}`;
  }

  public async sendPasswordResetLink(
    email: string,
    passwordResetLink: string,
    messageDuration: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Reset Your LFH password`,
      templateName: EEmailTemplateName.RESET_PASSWORD,
      context: {
        title: "Password Reset Request",
        link: passwordResetLink,
        duration: messageDuration,
        user: email,
      },
    });

    return `Code send to the ${email}`;
  }

  public async sendCompanySuperAdminInvitationLink(
    email: string,
    completeRegistrationLink: string,
    messageDuration: string,
    adminName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Complete LFH Company Registration Process`,
      templateName: EEmailTemplateName.COMPANY_REGISTRATION_LINK,
      context: {
        title: "Welcome To The LFH Platform!",
        adminName,
        link: completeRegistrationLink,
        message: "Process by the link below to change your password.",
        duration: messageDuration,
        user: email,
      },
    });

    return `Code send to the ${email}`;
  }

  public async sendCompanyRestorationLink(
    email: string,
    restorationLink: string,
    messageDuration: string,
    adminName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Company Account Deletion Notification`,
      templateName: EEmailTemplateName.COMPANY_RESTORATION_LINK,
      context: {
        title: "Account Deletion Confirmation",
        adminName,
        link: restorationLink,
        duration: messageDuration,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendUserSelfRestorationLink(
    email: string,
    restorationLink: string,
    messageDuration: string,
    userName: string,
    roleName?: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Account Removal Notification`,
      templateName: EEmailTemplateName.USER_SELF_RESTORATION_LINK,
      context: {
        title: "Account Removal Notification",
        userName,
        link: restorationLink,
        duration: messageDuration,
        roleName: roleName ?? null,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendUserRestorationLink(
    email: string,
    restorationLink: string,
    messageDuration: string,
    platformId: string,
    companyName: string,
    roleName?: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Account Removal Notification To Admin`,
      templateName: EEmailTemplateName.USER_RESTORATION_LINK,
      context: {
        title: "Account Removal Notification",
        platformId,
        companyName,
        link: restorationLink,
        duration: messageDuration,
        roleName: roleName ?? null,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendUserAccountRemovalNotification(
    email: string,
    messageDuration: string,
    roleName?: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Account Removal Notification`,
      templateName: EEmailTemplateName.USER_ACCOUNT_REMOVAL,
      context: {
        title: "Account Removal Notification",
        duration: messageDuration,
        roleName: roleName ?? null,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendCompanyEmployeeInvitationLink(
    email: string,
    completeRegistrationLink: string,
    messageDuration: string,
    adminName: string,
    roleName: EUserRoleName,
    companyName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Complete LFH Company Employee Registration Process`,
      templateName: EEmailTemplateName.COMPANY_EMPLOYEE_REGISTRATION_LINK,
      context: {
        title: "Welcome To The LFH Platform!",
        adminName,
        link: completeRegistrationLink,
        duration: messageDuration,
        role: roleName,
        companyName,
      },
    });

    return `Link sent to the ${email}`;
  }

  public async sendSuperAdminActivationLink(email: string, activationLink: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: "Super Admin Activation",
      templateName: EEmailTemplateName.SUPER_ADMIN_ACTIVATION,
      context: {
        title: "Welcome To The LFH Platform!",
        link: activationLink,
      },
    });

    return `Activation link sent to the ${email}`;
  }

  public async sendBackyCheckNotifyToAdmin(
    email: string,
    platformId: string,
    issueState: EExtIssueState,
    documentsAndPaymentLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify WWCC`,
      templateName: EEmailTemplateName.BACKY_CHECK_ADMIN_NOTIFY,
      context: {
        title: "WWCC Verification Required",
        platformId,
        issueState,
        link: documentsAndPaymentLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendConcessionCardNotifyToAdmin(
    email: string,
    platformId: string,
    documentsAndPaymentLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify Concession Card`,
      templateName: EEmailTemplateName.CONCESSION_CARD_ADMIN_NOTIFY,
      context: {
        title: "User Concession Card Submission",
        platformId,
        link: documentsAndPaymentLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendPteCheckNotifyToAdmin(
    email: string,
    platformId: string,
    documentsAndPaymentLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify PTE`,
      templateName: EEmailTemplateName.PTE_CHECK_ADMIN_NOTIFY,
      context: {
        title: "Verification Required",
        platformId,
        link: documentsAndPaymentLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendDocumentVerificationAccepted(email: string, verification: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `${verification} Accepted`,
      templateName: EEmailTemplateName.DOCUMENT_VERIFICATION_ACCEPTED,
      context: {
        title: `${verification} Successfully Verified`,
        verification,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendDocumentVerificationRejected(email: string, verification: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `${verification} Rejected`,
      templateName: EEmailTemplateName.DOCUMENT_VERIFICATION_REJECTED,
      context: {
        title: `${verification} Verification Failure`,
        verification,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendLanguageDocNotifyToAdmin(
    email: string,
    platformId: string,
    documentsAndPaymentLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify Language Doc`,
      templateName: EEmailTemplateName.LANGUAGE_DOC_ADMIN_NOTIFY,
      context: {
        title: "Verification Required",
        platformId,
        link: documentsAndPaymentLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendRightToWorkCheckNotifyToAdmin(
    email: string,
    platformId: string,
    documentsAndPaymentLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify Right To Work Check`,
      templateName: EEmailTemplateName.RIGHT_TO_WORK_CHECK_ADMIN_NOTIFY,
      context: {
        title: "Verification Required",
        platformId,
        link: documentsAndPaymentLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAbnNotifyToAdmin(
    email: string,
    platformId: string,
    abnTypeCode: string,
    documentsAndPaymentLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify ABN`,
      templateName: EEmailTemplateName.ABN_ADMIN_NOTIFY,
      context: {
        title: "Verification Required",
        platformId,
        abnTypeCode,
        link: documentsAndPaymentLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendNaatiWebScraperNotifyToAdmin(email: string, report: INaatiWebScraperReport): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `NAATI Web Scrapper Status Update`,
      templateName: EEmailTemplateName.NAATI_WEB_SCRAPPER_ADMIN_NOTIFY,
      context: {
        title: "Web Crawler Status Update",
        message: report.message,
        totalLanguagesProcessed: report.totalLanguagesProcessed,
        totalProfilesProcessed: report.totalProfilesProcessed,
        totalErrors: report.totalErrors,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAudioRecordUrlNotifyToAdmin(
    email: string,
    appointmentUrlLink: string,
    audioUrlLink: string,
    dateAccess: string,
    dateExpiration: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Call Record requested`,
      templateName: EEmailTemplateName.AUDIO_RECORD_URL_ADMIN_NOTIFY,
      context: {
        title: "Request To Access The Audio Recording Of Your Appointment",
        appointmentUrlLink,
        audioUrlLink,
        dateExpiration,
        dateAccess,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendUserRegistrationLink(
    email: string,
    registrationLink: string,
    messageDuration: string,
    roleName: EUserRoleName,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Invitation to Join LFH System`,
      templateName: EEmailTemplateName.USER_REGISTRATION_LINK,
      context: {
        title: "Invitation to Join LFH System",
        link: registrationLink,
        duration: messageDuration,
        role: roleName,
      },
    });

    return `Registration link sent to ${email}`;
  }

  public async sendDraftConfirmationLink(email: string, draftAppointmentLink: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Draft Appointment`,
      templateName: EEmailTemplateName.NEW_APPOINTMENT_CONFIRMATION,
      context: {
        title: "Your Appointment Confirmation",
        link: draftAppointmentLink,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendIncomingPaymentReceipt(email: string, receiptLink: string, data: IPayInReceipt): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Payment Invoice Paid`,
      templateName: EEmailTemplateName.INCOMING_PAYMENT_RECEIPT,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Incoming payment receipt sent to ${email}`;
  }

  public async sendOutgoingPaymentReceipt(email: string, receiptLink: string, data: IPayOutReceipt): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Remittance Advice`,
      templateName: EEmailTemplateName.OUTGOING_PAYMENT_RECEIPT,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Outgoing payment receipt sent to ${email}`;
  }

  public async sendTaxInvoicePaymentReceipt(
    email: string,
    receiptLink: string,
    data: ITaxInvoiceReceipt,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Tax Invoice`,
      templateName: EEmailTemplateName.TAX_INVOICE_RECEIPT,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Tax invoice receipt sent to ${email}`;
  }

  public async sendMembershipPriceUpdateEmail(
    email: string,
    userName: string,
    newPrice: number,
    membershipType: EMembershipType,
    endDate: Date,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Changes to Membership Price`,
      templateName: EEmailTemplateName.MEMBERSHIP_PRICE_UPDATE,
      context: {
        title: "Important Update From LFH: Changes To Membership Price",
        userName,
        newPrice: newPrice.toFixed(CURRENCY_DECIMAL_PLACES),
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
        endDate: format(endDate, "MMMM do, yyyy"),
      },
    });

    return `Price update email sent to ${email}`;
  }

  public async sendMembershipDeactivationEmail(
    email: string,
    userName: string,
    endDate: Date,
    membershipType: EMembershipType,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Membership Deactivation`,
      templateName: EEmailTemplateName.MEMBERSHIP_DEACTIVATION,
      context: {
        title: "Important Update From LFH: Changes To Membership",
        userName,
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
        endDate: format(endDate, "MMMM do, yyyy"),
      },
    });

    return `Deactivation email sent to ${email}`;
  }

  public async sendMembershipPaymentSucceededEmail(
    email: string,
    userName: string,
    membershipType: EMembershipType,
    receiptLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `LFH Payment Succeeded`,
      templateName: EEmailTemplateName.MEMBERSHIP_PAYMENT_SUCCEEDED,
      context: {
        title: "Payment Confirmation For Your Lingua Franca Hub Membership",
        userName,
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
        receiptLink,
      },
    });

    return `Membership payment succeeded email sent to ${email}`;
  }

  public async sendMembershipPaymentFailedEmail(
    email: string,
    userName: string,
    amount: number,
    currency: EPaymentCurrency,
    invoiceNumber: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Payment Failed: Action Required`,
      templateName: EEmailTemplateName.MEMBERSHIP_PAYMENT_FAILED,
      context: {
        title: `Payment Failed For Invoice No. ${invoiceNumber}`,
        userName,
        amount,
        currency,
        invoiceNumber,
      },
    });

    return `Membership payment failed email sent to ${email}`;
  }

  public async sendDepositChargeReceipt(
    email: string,
    receiptLink: string,
    data: IDepositChargeReceipt,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Deposit Charge Successful`,
      templateName: EEmailTemplateName.DEPOSIT_CHARGE_SUCCESSFUL,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Deposit Charge receipt sent to ${email}`;
  }

  public async sendDepositLowBalanceNotification(email: string, data: IDepositBalanceIsLow): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Low Account Balance Warning`,
      templateName: EEmailTemplateName.DEPOSIT_BALANCE_IS_LOW,
      context: {
        ...data,
      },
    });

    return `Deposit Balance Is Low notification sent to ${email}`;
  }

  public async sendDepositChargeFailedNotification(email: string, data: IDepositChargeFailed): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Balance Fulfillment Failed`,
      templateName: EEmailTemplateName.DEPOSIT_CHARGE_FAILED,
      context: {
        ...data,
      },
    });

    return `Deposit Charge Failed notification sent to ${email}`;
  }

  public async sendDepositBalanceInsufficientFundNotification(
    email: string,
    data: IDepositBalanceInsufficientFund,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Account Suspension Notification`,
      templateName: EEmailTemplateName.DEPOSIT_BALANCE_INSUFFICIENT_FUND,
      context: {
        ...data,
      },
    });

    return `Service Termination Low Balance notification sent to ${email}`;
  }

  public async sendOutgoingCorporatePaymentReceipt(
    email: string,
    receiptLink: string,
    data: ICorporatePayOutReceipt,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Remittance Advice`,
      templateName: EEmailTemplateName.OUTGOING_CORPORATE_PAYMENT_RECEIPT,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Outgoing payment receipt sent to ${email}`;
  }

  public async sendTaxInvoiceCorporatePaymentReceipt(
    email: string,
    receiptLink: string,
    data: ICorporateTaxInvoiceReceipt,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Tax Invoice`,
      templateName: EEmailTemplateName.TAX_INVOICE_CORPORATE_RECEIPT,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Tax invoice receipt sent to ${email}`;
  }

  public async sendPostPaymentCorporateReceipt(
    email: string,
    receiptLink: string,
    data: ICorporatePostPaymentReceipt,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Invoice`,
      templateName: EEmailTemplateName.POST_PAYMENT_CORPORATE_RECEIPT,
      layoutName: EEmailLayoutName.PAYMENTS_BASE,
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Invoice receipt sent to ${email}`;
  }

  public async sendRedFlagEnabledEmail(
    email: string,
    platformId: string,
    appointmentDetailsLink: string,
    isOrderGroup?: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Red Flag`,
      templateName: EEmailTemplateName.RED_FLAG_ADMIN_NOTIFY,
      context: {
        title: "Red Flag Notification",
        platformId,
        link: appointmentDetailsLink,
        target: isOrderGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAppointmentCancellationNoticeBySystemEmail(
    email: string,
    platformId: string,
    userName: string,
    isGroup: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Cancellation Notice`,
      templateName: EEmailTemplateName.APPOINTMENT_CANCELLATION_NOTICE_BY_SYSTEM,
      context: {
        title: `Appointment Cancellation Notice By The System`,
        platformId,
        userName,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAppointmentCancellationNoticeByAdminEmail(
    email: string,
    platformId: string,
    isGroup: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Cancellation Notice`,
      templateName: EEmailTemplateName.APPOINTMENT_CANCELLATION_NOTICE_BY_ADMIN,
      context: {
        title: `Appointment Cancellation Notice By The Admin Team`,
        platformId,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAppointmentCancellationNoticeByInterpreterEmail(
    email: string,
    platformId: string,
    interpreterPlatformId: string,
    isGroup: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Cancellation Notice`,
      templateName: EEmailTemplateName.APPOINTMENT_CANCELLATION_NOTICE_BY_INTERPRETER,
      context: {
        title: `Appointment Cancellation Notice By The Interpreter`,
        platformId,
        interpreterPlatformId,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAppointmentCancellationNoticeToExtraParticipant(email: string, isGroup: boolean): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Cancellation Notice`,
      templateName: EEmailTemplateName.APPOINTMENT_CANCELLATION_NOTICE_EXTRA_PARTICIPANT,
      context: {
        title: `Appointment Cancellation Notice`,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAppointmentCancellationBeforeDeadlineEmail(
    email: string,
    platformId: string,
    firstName: string,
    lastName: string,
    isGroup: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Cancellation`,
      templateName: EEmailTemplateName.APPOINTMENT_CANCELLATION_BEFORE_DEADLINE,
      context: {
        title: `The Client Cancelled Your Appointment With Sufficient Notice`,
        platformId,
        userName: `${firstName} ${lastName}`,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAppointmentCancellationAfterDeadlineEmail(
    email: string,
    platformId: string,
    firstName: string,
    lastName: string,
    isGroup: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Cancellation`,
      templateName: EEmailTemplateName.APPOINTMENT_CANCELLATION_AFTER_DEADLINE,
      context: {
        title: `The Client Cancelled Your Appointment With Insufficient Notice`,
        platformId,
        userName: `${firstName} ${lastName}`,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendRepeatedAppointmentInvitationEmail(
    email: string,
    platformId: string,
    appointmentDetailsLink: string,
    isGroup: boolean,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Repeated Appointment Invitation`,
      templateName: EEmailTemplateName.REPEATED_APPOINTMENT_INVITATION,
      context: {
        title: `Appointment Invitation`,
        platformId,
        link: appointmentDetailsLink,
        target: isGroup ? "appointment group" : "appointment",
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendUserAvatarAdminNotifyEmail(
    email: string,
    platformId: string,
    userProfileLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Profile Image Verification Required`,
      templateName: EEmailTemplateName.USER_AVATAR_ADMIN_NOTIFY,
      context: {
        title: `Profile Image Verification Required`,
        platformId,
        link: userProfileLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendNewCompanyRequestNotifyToAdminEmail(
    email: string,
    newCompanyRequestDetails: INewCompanyRequestDetails,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `New Company Registration Request`,
      templateName: EEmailTemplateName.NEW_COMPANY_REQUEST_ADMIN_NOTIFY,
      context: {
        title: `New Company Registration Request – Action Needed`,
        companyName: newCompanyRequestDetails.companyName,
        phoneNumber: newCompanyRequestDetails.phoneNumber,
        country: newCompanyRequestDetails.country,
        contactPersonName: newCompanyRequestDetails.contactPersonName,
        contactEmail: newCompanyRequestDetails.contactEmail,
        industry: newCompanyRequestDetails.industry ?? "N/A",
        numberOfEmployees: newCompanyRequestDetails.numberOfEmployees,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendNewCompanyRequestEmail(
    email: string,
    newCompanyRequestDetails: INewCompanyRequestDetails,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `New Company Registration Request`,
      templateName: EEmailTemplateName.NEW_COMPANY_REQUEST,
      context: {
        title: `Registration Request Received`,
        companyName: newCompanyRequestDetails.companyName,
        phoneNumber: newCompanyRequestDetails.phoneNumber,
        country: newCompanyRequestDetails.country,
        contactPersonName: newCompanyRequestDetails.contactPersonName,
        contactEmail: newCompanyRequestDetails.contactEmail,
        industry: newCompanyRequestDetails.industry ?? "N/A",
        numberOfEmployees: newCompanyRequestDetails.numberOfEmployees,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendCompanyActivatedEmail(email: string, companyAdminName: string, loginLink: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Company Account Activated`,
      templateName: EEmailTemplateName.COMPANY_ACCOUNT_ACTIVATED,
      context: {
        title: `Welcome To The LFH Platform!`,
        companyAdminName,
        link: loginLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendCompanyDeactivatedEmail(email: string, companyAdminName: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Company Account Deactivated`,
      templateName: EEmailTemplateName.COMPANY_ACCOUNT_DEACTIVATED,
      context: {
        title: `Your Company Has Been Deactivated`,
        companyAdminName,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendIndividualAccountActivatedEmail(
    email: string,
    userName: string,
    loginLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Account Activated`,
      templateName: EEmailTemplateName.INDIVIDUAL_ACCOUNT_ACTIVATED,
      context: {
        title: `Welcome To The LFH Platform!`,
        userName,
        link: loginLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendIndividualAccountDeactivatedEmail(email: string, userName: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Account Deactivated`,
      templateName: EEmailTemplateName.INDIVIDUAL_ACCOUNT_DEACTIVATED,
      context: {
        title: `Your Account Has Been Deactivated`,
        userName,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendWelcomeToLfhEmail(email: string, loginLink: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Welcome`,
      templateName: EEmailTemplateName.WELCOME_TO_LFH,
      context: {
        title: `Welcome To The LFH Platform!`,
        link: loginLink,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAttendeeInvitationEmail(
    email: string,
    data: IAppointmentParticipantInvitationOutput,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Appointment Invitation`,
      templateName: EEmailTemplateName.ATTENDEE_INVITATION,
      context: {
        title: `Invitation to Participate in a Virtual Appointment`,
        clientName: `${data.clientFirstName} ${data.clientLastName}`,
        platformId: data.platformId,
        startDate: format(data.scheduledStartTime, "dd MMM yyyy HH:mm"),
        languageFrom: data.languageFrom,
        languageTo: data.languageTo,
        topic: data.topic,
        schedulingDurationMin: data.schedulingDurationMin,
        meetingUrl: data.meetingUrl,
      },
    });

    return `Notify send to the ${email}`;
  }
}
