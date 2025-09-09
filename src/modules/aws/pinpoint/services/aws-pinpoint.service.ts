import {
  MessageRequest,
  MessageType,
  PinpointClient,
  PinpointClientConfig,
  SendMessagesCommand,
  SendMessagesCommandOutput,
} from "@aws-sdk/client-pinpoint";
import {
  PinpointSMSVoiceV2Client,
  PinpointSMSVoiceV2ClientConfig,
  SendTextMessageCommand,
} from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LokiLogger } from "src/common/logger";
import { generateCode } from "src/common/utils";
import { AwsConfigService } from "src/modules/aws/config/services";
import { IAwsConfigPinpoint } from "src/modules/aws/pinpoint/common/interfaces";
import { IAppointmentParticipantInvitationOutput } from "src/modules/appointments/appointment/common/outputs";
import { format } from "date-fns";
import { COMPANY_LFH_NAME } from "src/modules/companies/common/constants/constants";

@Injectable()
export class AwsPinpointService {
  private readonly lokiLogger = new LokiLogger(AwsPinpointService.name);
  private readonly pinpointSmsV2Client: PinpointSMSVoiceV2Client;
  private readonly pinpointClient: PinpointClient;

  private readonly SMS_SINGLE_CHARS_LIMIT: number = 160;
  private readonly ORIGINAL_IDENTITY: string = COMPANY_LFH_NAME;

  private readonly ttlMinutes: number;
  private readonly PINPOINT_APPLICATION_ID: string;

  public constructor(
    private readonly configService: ConfigService,
    private readonly awsConfigService: AwsConfigService,
  ) {
    const { credentials, region, pinpointApplicationId } = this.configService.getOrThrow<IAwsConfigPinpoint>("aws");
    this.PINPOINT_APPLICATION_ID = pinpointApplicationId;
    this.pinpointSmsV2Client = new PinpointSMSVoiceV2Client(
      this.awsConfigService.getStandardClientConfig<PinpointSMSVoiceV2ClientConfig>(region, credentials),
    );
    this.pinpointClient = new PinpointClient(
      this.awsConfigService.getStandardClientConfig<PinpointClientConfig>(region, credentials),
    );
    this.ttlMinutes = this.configService.getOrThrow<number>("redis.ttlMinutes");
  }

  public async sendPushNotification(param: MessageRequest): Promise<SendMessagesCommandOutput> {
    try {
      const sendMessagesCommand = new SendMessagesCommand({
        ApplicationId: this.PINPOINT_APPLICATION_ID,
        MessageRequest: param,
      });

      const response = await this.pinpointClient.send(sendMessagesCommand);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Error sending push notification: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to send push notification");
    }
  }

  private async sendSmsMessage(phoneNumber: string, messageBody: string): Promise<void> {
    try {
      const command = new SendTextMessageCommand({
        DestinationPhoneNumber: phoneNumber,
        OriginationIdentity: this.ORIGINAL_IDENTITY,
        MessageBody: messageBody,
        MessageType: MessageType.TRANSACTIONAL,
      });
      await this.pinpointSmsV2Client.send(command);
    } catch (error) {
      this.lokiLogger.error(`Error sending SMS: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to send SMS");
    }
  }

  public async sendVerificationCode(phoneNumber: string): Promise<string> {
    const confirmationCode = generateCode();
    const messageBody = `Verification code: ${confirmationCode}. It will expire in ${this.ttlMinutes} minutes`;

    await this.sendSmsMessage(phoneNumber, messageBody);

    return confirmationCode;
  }

  public async sendParticipantInvitation(
    phoneNumber: string,
    invitationData: IAppointmentParticipantInvitationOutput,
  ): Promise<void> {
    const messageConstantPart = `invited you to appointment. Meeting start time: ${format(invitationData.scheduledStartTime, "dd MMM yyyy HH:mm")}. Link: ${invitationData.meetingUrl}`;
    const fullNameMessage = `${invitationData.clientFirstName} ${invitationData.clientLastName} ${messageConstantPart}`;
    let messageBody = fullNameMessage;

    if (fullNameMessage.length > this.SMS_SINGLE_CHARS_LIMIT) {
      messageBody = `${this.ORIGINAL_IDENTITY} ${messageConstantPart}`;
    }

    await this.sendSmsMessage(phoneNumber, messageBody);
  }

  public async sendAppointmentCancellationNoticeToExtraParticipant(
    phoneNumber: string,
    isGroupCancellation: boolean,
  ): Promise<void> {
    const target = isGroupCancellation ? "appointment group" : "appointment";
    const messageBody = `Hello, your ${target} has been cancelled. Contact support@linguafrancahub.com for assistance.`;
    await this.sendSmsMessage(phoneNumber, messageBody);
  }
}
