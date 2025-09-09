import {
  ENotificationDataType,
  ENotificationPlatformType,
  ENotificationUserTarget,
} from "src/modules/notifications/common/enum";
import { ICancelOnDemandInvitationOutput } from "src/modules/appointment-orders/appointment-order/common/outputs";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";
import { IDraftAppointmentDetailsOutput } from "src/modules/draft-appointments/common/outputs";
import { ICompanyDetailsOutput, IUserRoleDetailsOutput } from "src/modules/notifications/common/outputs";
import {
  IAppointmentOrderInvitationOutput,
  IOnDemandInvitationOutput,
  ISearchConditionsOutput,
} from "src/modules/search-engine-logic/common/outputs";
import { IChatMessageOutput } from "src/modules/chime-messaging-configuration/common/outputs";

export interface INotificationData {
  data: NotificationData;
  platformTypes: ENotificationPlatformType;
  userTarget: ENotificationUserTarget;
}

export interface ITextInfoData {
  type: ENotificationDataType.TEXT_INFO;
}

export interface ISearchEngineData {
  type: ENotificationDataType.SEARCH_ENGINE;
  extraData: ISearchConditionsOutput;
}

export interface IOnDemandInvitationData {
  type: ENotificationDataType.ON_DEMAND_INVITATION;
  extraData: IOnDemandInvitationOutput;
}

export interface ICancelOnDemandInvitationData {
  type: ENotificationDataType.CANCEL_ON_DEMAND_INVITATION;
  extraData: ICancelOnDemandInvitationOutput;
}

export interface IWWCCVerificationData {
  type: ENotificationDataType.WWCC_VERIFICATION;
}

export interface IRightToWorkVerificationData {
  type: ENotificationDataType.RIGHT_TO_WORK_VERIFICATION;
}

export interface ILanguageDocVerificationData {
  type: ENotificationDataType.LANGUAGE_DOCS_VERIFICATION;
}

export interface IConcessionCardVerificationData {
  type: ENotificationDataType.CONCESSION_CARD_VERIFICATION;
}

export interface IAccountActivationData {
  type: ENotificationDataType.ACCOUNT_ACTIVATION;
}

export interface IAccountDeactivationData {
  type: ENotificationDataType.ACCOUNT_DEACTIVATION;
}

export interface IAppointmentOrderInvitationData {
  type: ENotificationDataType.APPOINTMENT_ORDER_INVITATION;
  extraData: IAppointmentOrderInvitationOutput;
}

export interface IDraftAppointmentDetailsData {
  type: ENotificationDataType.DRAFT_APPOINTMENT_DETAILS;
  extraData: IDraftAppointmentDetailsOutput;
}

export interface IAppointmentDetailsData {
  type: ENotificationDataType.APPOINTMENT_DETAILS;
  extraData: IAppointmentDetailsOutput;
}

export interface IRedFlagDetailsData {
  type: ENotificationDataType.RED_FLAG_DETAILS;
  extraData: IAppointmentDetailsOutput;
}

export interface IAvatarVerificationData {
  type: ENotificationDataType.AVATAR_VERIFICATION;
}

export interface IChatMessageData {
  type: ENotificationDataType.CHAT_MESSAGE;
  extraData: IChatMessageOutput;
}

export interface IAppointmentPaymentSucceededData {
  type: ENotificationDataType.APPOINTMENT_PAYMENT_SUCCEEDED;
  extraData: IAppointmentDetailsOutput;
}

export interface IAppointmentPaymentFailedData {
  type: ENotificationDataType.APPOINTMENT_PAYMENT_FAILED;
  extraData: IAppointmentDetailsOutput;
}

export interface IIncorrectPaymentInformationData {
  type: ENotificationDataType.INCORRECT_PAYMENT_INFORMATION;
  extraData: IUserRoleDetailsOutput;
}

export interface IDepositChargeSucceededData {
  type: ENotificationDataType.DEPOSIT_CHARGE_SUCCEEDED;
  extraData: ICompanyDetailsOutput;
}

export interface IDepositChargeFailedData {
  type: ENotificationDataType.DEPOSIT_CHARGE_FAILED;
  extraData: ICompanyDetailsOutput;
}

export type NotificationData =
  | ITextInfoData
  | IOnDemandInvitationData
  | ICancelOnDemandInvitationData
  | ISearchEngineData
  | IWWCCVerificationData
  | IRightToWorkVerificationData
  | ILanguageDocVerificationData
  | IConcessionCardVerificationData
  | IAccountActivationData
  | IAccountDeactivationData
  | IAppointmentOrderInvitationData
  | IDraftAppointmentDetailsData
  | IAppointmentDetailsData
  | IRedFlagDetailsData
  | IAvatarVerificationData
  | IChatMessageData
  | IAppointmentPaymentSucceededData
  | IAppointmentPaymentFailedData
  | IIncorrectPaymentInformationData
  | IDepositChargeSucceededData
  | IDepositChargeFailedData;
