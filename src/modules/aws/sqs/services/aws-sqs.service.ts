import {
  DeleteMessageBatchCommand,
  GetQueueAttributesCommand,
  Message,
  QueueAttributeName,
  ReceiveMessageCommand,
  SQSClient,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LokiLogger } from "src/common/logger";
import { AwsConfigService } from "src/modules/aws/config/services";
import { IAwsConfigSqs } from "src/modules/aws/sqs/common/interfaces";
import { EAwsSQSErrorCodes } from "src/modules/aws/sqs/common/enums";

@Injectable()
export class AwsSQSService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly lokiLogger = new LokiLogger(AwsSQSService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly awsConfigService: AwsConfigService,
  ) {
    const { credentials, region, sqsQueueUrl } = this.configService.getOrThrow<IAwsConfigSqs>("aws");
    this.queueUrl = sqsQueueUrl;
    this.sqsClient = new SQSClient(this.awsConfigService.getStandardClientConfig<SQSClientConfig>(region, credentials));
  }

  public async getApproximateNumberOfMessages(): Promise<number> {
    try {
      const params = {
        QueueUrl: this.queueUrl,
        AttributeNames: [QueueAttributeName.ApproximateNumberOfMessages],
      };

      const { Attributes } = await this.sqsClient.send(new GetQueueAttributesCommand(params));

      return Number(Attributes!.ApproximateNumberOfMessages);
    } catch (error) {
      this.lokiLogger.error(`Failed to get queue attributes: ${(error as Error).message}`);
      throw new ServiceUnavailableException(EAwsSQSErrorCodes.SQS_GET_QUEUE_ATTRIBUTES_FAILED);
    }
  }

  public async pollMessages(): Promise<Message[]> {
    try {
      const params = {
        AttributeNames: [QueueAttributeName.All],
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      };

      const { Messages } = await this.sqsClient.send(new ReceiveMessageCommand(params));

      if (Messages && Messages.length > 0) {
        this.lokiLogger.log(`Received ${Messages.length} messages.`);
        const receiptHandles = Messages.map((message) => message.ReceiptHandle!);
        await this.deleteMessages(receiptHandles);

        return Messages;
      }
    } catch (error) {
      this.lokiLogger.error(`Failed to receive AWS-SQS messages: ${(error as Error).message}`);
      throw new ServiceUnavailableException(EAwsSQSErrorCodes.SQS_RECEIVE_MESSAGES_FAILED);
    }

    return [];
  }

  public async deleteMessages(receiptHandles: string[]): Promise<void> {
    try {
      const entries = receiptHandles.map((receiptHandle, index) => ({
        Id: index.toString(),
        ReceiptHandle: receiptHandle,
      }));

      const deleteParams = {
        QueueUrl: this.queueUrl,
        Entries: entries,
      };

      await this.sqsClient.send(new DeleteMessageBatchCommand(deleteParams));
      this.lokiLogger.log("AWS-SQS Messages deleted successfully");
    } catch (error) {
      this.lokiLogger.error(`Failed to delete AWS-SQS messages: ${(error as Error).message}`);
      throw new ServiceUnavailableException(EAwsSQSErrorCodes.SQS_DELETE_MESSAGES_FAILED);
    }
  }
}
