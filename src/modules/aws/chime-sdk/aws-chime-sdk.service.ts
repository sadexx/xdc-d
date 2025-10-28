import {
  ArtifactsConcatenationState,
  ArtifactsState,
  AudioArtifactsConcatenationState,
  AudioMuxType,
  ChimeSDKMediaPipelinesClient,
  ChimeSDKMediaPipelinesClientConfig,
  ConcatenationSinkType,
  ConcatenationSourceType,
  CreateMediaCapturePipelineCommand,
  CreateMediaCapturePipelineCommandOutput,
  CreateMediaConcatenationPipelineCommand,
  CreateMediaConcatenationPipelineCommandOutput,
  MediaPipelineSinkType,
  MediaPipelineSourceType,
} from "@aws-sdk/client-chime-sdk-media-pipelines";
import {
  AttendeeCapabilities,
  ChimeSDKMeetingsClient,
  ContentResolution,
  CreateAttendeeCommand,
  CreateAttendeeCommandOutput,
  CreateMeetingWithAttendeesCommand,
  CreateMeetingWithAttendeesCommandOutput,
  DeleteAttendeeCommand,
  DeleteAttendeeCommandOutput,
  DeleteMeetingCommand,
  DeleteMeetingCommandOutput,
  GetAttendeeCommand,
  GetAttendeeCommandOutput,
  GetMeetingCommand,
  GetMeetingCommandOutput,
  ListAttendeesCommand,
  ListAttendeesCommandOutput,
  NotFoundException as AwsNotFoundException,
  UpdateAttendeeCapabilitiesCommand,
  UpdateAttendeeCapabilitiesCommandOutput,
  BatchUpdateAttendeeCapabilitiesExceptCommand,
  AttendeeIdItem,
  ChimeSDKMeetingsClientConfig,
} from "@aws-sdk/client-chime-sdk-meetings";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { getCurrentDateParts } from "src/common/utils";
import { IAwsConfigChimeSdk } from "src/modules/aws/chime-sdk/common/interfaces";
import { EAwsChimeSdkErrorCodes, ERecordDirectory } from "src/modules/aws/chime-sdk/common/enum";
import {
  ChimeSDKVoiceClient,
  ChimeSDKVoiceClientConfig,
  CreateSipMediaApplicationCallCommand,
  CreateSipMediaApplicationCallCommandOutput,
} from "@aws-sdk/client-chime-sdk-voice";
import { LokiLogger } from "src/common/logger";
import { AwsConfigService } from "src/modules/aws/config/services";
import { TMeetingConfigForJoin } from "src/modules/chime-meeting-configuration/common/types";

@Injectable()
export class AwsChimeSdkService {
  private readonly lokiLogger = new LokiLogger(AwsChimeSdkService.name);
  private readonly controlRegion: string;
  private readonly mediaRegion: string;
  private readonly awsAccountId: string;
  private readonly sipMediaApplicationId: string;
  private readonly s3BucketName: string;
  private readonly meetingsClient: ChimeSDKMeetingsClient;
  private readonly mediaPipelinesClient: ChimeSDKMediaPipelinesClient;
  private readonly voiceClient: ChimeSDKVoiceClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsConfigService: AwsConfigService,
  ) {
    const { region, chimeControlRegion, credentials, awsAccountId, sipMediaApplicationId, s3BucketName } =
      this.configService.getOrThrow<IAwsConfigChimeSdk>("aws");

    this.controlRegion = chimeControlRegion;
    this.mediaRegion = region;
    this.awsAccountId = awsAccountId;
    this.sipMediaApplicationId = sipMediaApplicationId;
    this.s3BucketName = s3BucketName;
    this.meetingsClient = new ChimeSDKMeetingsClient(
      this.awsConfigService.getStandardClientConfig<ChimeSDKMeetingsClientConfig>(chimeControlRegion, credentials),
    );
    this.mediaPipelinesClient = new ChimeSDKMediaPipelinesClient(
      this.awsConfigService.getStandardClientConfig<ChimeSDKMediaPipelinesClientConfig>(region, credentials),
    );
    this.voiceClient = new ChimeSDKVoiceClient(
      this.awsConfigService.getStandardClientConfig<ChimeSDKVoiceClientConfig>(chimeControlRegion, credentials),
    );
  }

  public async createMeetingWithAttendees(
    meetingConfig: TMeetingConfigForJoin,
    mediaRegion?: string,
  ): Promise<CreateMeetingWithAttendeesCommandOutput> {
    try {
      const defaultMediaRegion = this.mediaRegion;
      const createMeetingCommand = new CreateMeetingWithAttendeesCommand({
        ClientRequestToken: randomUUID(),
        MediaRegion: mediaRegion ?? defaultMediaRegion,
        MeetingFeatures: {
          Audio: {
            EchoReduction: meetingConfig.echoReduction,
          },
          Video: {
            MaxResolution: meetingConfig.maxVideoResolution,
          },
          Content: {
            MaxResolution: meetingConfig.maxContentResolution as ContentResolution,
          },
          Attendee: {
            MaxCount: meetingConfig.maxAttendees,
          },
        },
        ExternalMeetingId: meetingConfig.id,
        Attendees: meetingConfig.attendees.map((attendeeDto) => ({
          ExternalUserId: attendeeDto.externalUserId,
          AttendeeCapabilities: {
            Audio: attendeeDto.audioCapabilities,
            Video: attendeeDto.videoCapabilities,
            Content: attendeeDto.contentCapabilities,
          },
        })),
      });
      const meetingResponse = await this.meetingsClient.send(createMeetingCommand);

      return meetingResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to create meeting: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_CREATE_MEETING_FAILED);
    }
  }

  public async getMeeting(meetingId: string): Promise<GetMeetingCommandOutput | null> {
    try {
      const getMeetingCommand = new GetMeetingCommand({ MeetingId: meetingId });
      const meetingResponse = await this.meetingsClient.send(getMeetingCommand);

      return meetingResponse;
    } catch (error) {
      if (error instanceof AwsNotFoundException) {
        this.lokiLogger.warn(`Meeting ${meetingId} not found because it has expired, will create a new one.`);

        return null;
      } else {
        this.lokiLogger.error(`Failed to get meeting: ${(error as Error).message}`, (error as Error).stack);
        throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_GET_MEETING_FAILED);
      }
    }
  }

  public async deleteMeeting(meetingId: string): Promise<DeleteMeetingCommandOutput> {
    try {
      const deleteMeetingCommand = new DeleteMeetingCommand({ MeetingId: meetingId });
      const deleteMeetingResponse = await this.meetingsClient.send(deleteMeetingCommand);

      return deleteMeetingResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to delete meeting: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_DELETE_MEETING_FAILED);
    }
  }

  public async listAttendees(meetingId: string): Promise<ListAttendeesCommandOutput> {
    try {
      const listAttendeesCommand = new ListAttendeesCommand({ MeetingId: meetingId });
      const attendeesResponse = await this.meetingsClient.send(listAttendeesCommand);

      return attendeesResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to list attendees: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_LIST_ATTENDEES_FAILED);
    }
  }

  public async getAttendee(meetingId: string, attendeeId: string): Promise<GetAttendeeCommandOutput> {
    try {
      const getAttendeeCommand = new GetAttendeeCommand({ MeetingId: meetingId, AttendeeId: attendeeId });
      const attendeeResponse = await this.meetingsClient.send(getAttendeeCommand);

      return attendeeResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to get attendee: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_GET_ATTENDEE_FAILED);
    }
  }

  public async createAttendee(
    meetingId: string,
    externalUserId: string,
    capabilities?: AttendeeCapabilities,
  ): Promise<CreateAttendeeCommandOutput> {
    try {
      const createAttendeeCommand = new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: externalUserId,
        Capabilities: capabilities,
      });
      const attendeeResponse = await this.meetingsClient.send(createAttendeeCommand);

      return attendeeResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to create attendee: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_CREATE_ATTENDEE_FAILED);
    }
  }

  public async updateAttendeeCapabilities(
    meetingId: string,
    attendeeId: string,
    capabilities: AttendeeCapabilities,
  ): Promise<UpdateAttendeeCapabilitiesCommandOutput> {
    try {
      const updateAttendeeCommand = new UpdateAttendeeCapabilitiesCommand({
        MeetingId: meetingId,
        AttendeeId: attendeeId,
        Capabilities: capabilities,
      });
      const attendeeResponse = await this.meetingsClient.send(updateAttendeeCommand);

      return attendeeResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to update attendee: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_UPDATE_ATTENDEE_FAILED);
    }
  }

  public async updateAttendeesCapabilitiesExcept(
    meetingId: string,
    attendeesIds: AttendeeIdItem[],
    capabilities: AttendeeCapabilities,
  ): Promise<UpdateAttendeeCapabilitiesCommandOutput> {
    try {
      const updateAttendeesExceptCommand = new BatchUpdateAttendeeCapabilitiesExceptCommand({
        MeetingId: meetingId,
        ExcludedAttendeeIds: attendeesIds,
        Capabilities: capabilities,
      });
      const attendeeResponse = await this.meetingsClient.send(updateAttendeesExceptCommand);

      return attendeeResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to update attendees: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_UPDATE_ATTENDEES_FAILED);
    }
  }

  public async deleteAttendee(meetingId: string, attendeeId: string): Promise<DeleteAttendeeCommandOutput> {
    try {
      const deleteAttendeeCommand = new DeleteAttendeeCommand({ MeetingId: meetingId, AttendeeId: attendeeId });
      const deleteAttendeeResponse = await this.meetingsClient.send(deleteAttendeeCommand);

      return deleteAttendeeResponse;
    } catch (error) {
      this.lokiLogger.error(`Failed to delete attendee: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_DELETE_ATTENDEE_FAILED);
    }
  }

  public async startMediaCapturePipeline(meetingId: string): Promise<CreateMediaCapturePipelineCommandOutput> {
    try {
      const { year, month, day } = getCurrentDateParts();
      const outputDirectory = `${ERecordDirectory.RAW_AUDIO}/${year}/${month}/${day}/${meetingId}`;
      const mediaCaptureCommand = new CreateMediaCapturePipelineCommand({
        SourceType: MediaPipelineSourceType.ChimeSdkMeeting,
        SourceArn: `arn:aws:chime::${this.awsAccountId}:meeting/${meetingId}`,
        SinkType: MediaPipelineSinkType.S3Bucket,
        SinkArn: `arn:aws:s3:::${this.s3BucketName}/${outputDirectory}`,
        ChimeSdkMeetingConfiguration: {
          ArtifactsConfiguration: {
            Audio: {
              MuxType: AudioMuxType.AudioOnly,
            },
            Video: {
              State: ArtifactsState.Disabled,
            },
            Content: {
              State: ArtifactsState.Disabled,
            },
          },
        },
      });
      const response = await this.mediaPipelinesClient.send(mediaCaptureCommand);

      return response;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to start media capture pipeline: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_START_CAPTURE_PIPELINE_FAILED);
    }
  }

  public async createMediaConcatenationPipeline(
    mediaRegion: string,
    mediaPipelineId: string,
    outputDirectoryForConcat: string,
  ): Promise<CreateMediaConcatenationPipelineCommandOutput> {
    try {
      const concatCommand = new CreateMediaConcatenationPipelineCommand({
        ClientRequestToken: randomUUID(),
        Sinks: [
          {
            Type: ConcatenationSinkType.S3Bucket,
            S3BucketSinkConfiguration: {
              Destination: `arn:aws:s3:::${this.s3BucketName}/${outputDirectoryForConcat}`,
            },
          },
        ],
        Sources: [
          {
            Type: ConcatenationSourceType.MediaCapturePipeline,
            MediaCapturePipelineSourceConfiguration: {
              MediaPipelineArn: `arn:aws:chime:${mediaRegion}:${this.awsAccountId}:media-pipeline/${mediaPipelineId}`,
              ChimeSdkMeetingConfiguration: {
                ArtifactsConfiguration: {
                  Audio: {
                    State: AudioArtifactsConcatenationState.Enabled,
                  },
                  Video: {
                    State: ArtifactsConcatenationState.Disabled,
                  },
                  Content: {
                    State: ArtifactsConcatenationState.Disabled,
                  },
                  DataChannel: {
                    State: ArtifactsConcatenationState.Disabled,
                  },
                  TranscriptionMessages: {
                    State: ArtifactsConcatenationState.Disabled,
                  },
                  MeetingEvents: {
                    State: ArtifactsConcatenationState.Disabled,
                  },
                  CompositedVideo: {
                    State: ArtifactsConcatenationState.Disabled,
                  },
                },
              },
            },
          },
        ],
      });

      const response = await this.mediaPipelinesClient.send(concatCommand);

      return response;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to create media concatenation pipeline: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_CREATE_CONCATENATION_PIPELINE_FAILED);
    }
  }

  public async createSipMediaApplicationCall(
    fromPhoneNumber: string,
    toPhoneNumber: string,
    meetingId: string,
    attendeeId?: string,
  ): Promise<CreateSipMediaApplicationCallCommandOutput> {
    try {
      const createSipMediaApplicationCallCommand = new CreateSipMediaApplicationCallCommand({
        FromPhoneNumber: fromPhoneNumber,
        ToPhoneNumber: toPhoneNumber,
        SipMediaApplicationId: this.sipMediaApplicationId,
        ArgumentsMap: {
          MeetingId: meetingId,
          ChimeRegion: this.controlRegion,
          ChimeAttendeeId: attendeeId ?? "",
        },
      });
      const sipMediaApplicationCallResponse = await this.voiceClient.send(createSipMediaApplicationCallCommand);

      return sipMediaApplicationCallResponse;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to create sip media application call: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(EAwsChimeSdkErrorCodes.CHIME_SDK_CREATE_SIP_CALL_FAILED);
    }
  }
}
