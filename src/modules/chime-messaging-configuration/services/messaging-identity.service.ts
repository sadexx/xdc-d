import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppInstanceConfig } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws/messaging-sdk/aws-messaging-sdk.service";
import { UserRole } from "src/modules/users/entities";
import { APP_INSTANCE_NAME } from "src/common/constants";
import { findOneOrFail } from "src/common/utils";
import { RedisService } from "src/modules/redis/services";
import { EChimeMessagingConfigurationErrorCodes } from "src/modules/chime-messaging-configuration/common/enums";

@Injectable()
export class MessagingIdentityService {
  constructor(
    @InjectRepository(AppInstanceConfig)
    private readonly appInstanceConfigRepository: Repository<AppInstanceConfig>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
    private readonly redisService: RedisService,
  ) {}

  public async createAppInstance(instanceName: string): Promise<void> {
    const existingConfig = await this.appInstanceConfigRepository.findOne({
      where: { name: instanceName },
    });

    if (existingConfig) {
      return;
    }

    const appInstanceResponse = await this.awsMessagingSdkService.createAppInstance(instanceName);

    if (!appInstanceResponse || !appInstanceResponse.AppInstanceArn) {
      throw new ServiceUnavailableException(
        EChimeMessagingConfigurationErrorCodes.MESSAGING_IDENTITY_CREATE_APP_INSTANCE_FAILED,
      );
    }

    const adminResponse = await this.awsMessagingSdkService.createAppInstanceAdmin(appInstanceResponse.AppInstanceArn);

    await this.appInstanceConfigRepository.save({
      name: instanceName,
      appInstanceArn: appInstanceResponse.AppInstanceArn,
      adminArn: adminResponse.AppInstanceAdmin?.Arn,
    });
  }

  public async createAppInstanceUser(userRoleId: string): Promise<void> {
    const existingConfig = await this.appInstanceConfigRepository.findOne({
      where: { name: APP_INSTANCE_NAME },
    });

    if (!existingConfig) {
      return;
    }

    const { appInstanceArn } = await this.getConfig();

    const createAppInstanceUserCommand = await this.awsMessagingSdkService.createAppInstanceUser(appInstanceArn);

    if (createAppInstanceUserCommand.AppInstanceUserArn) {
      await this.userRoleRepository.update(userRoleId, {
        instanceUserArn: createAppInstanceUserCommand.AppInstanceUserArn,
      });
    }
  }

  public async getConfig(): Promise<AppInstanceConfig> {
    let config = await this.redisService.getJson<AppInstanceConfig | null>(APP_INSTANCE_NAME);

    if (!config) {
      config = await findOneOrFail(
        APP_INSTANCE_NAME,
        this.appInstanceConfigRepository,
        { where: { name: APP_INSTANCE_NAME } },
        "name",
      );

      await this.redisService.setJson(APP_INSTANCE_NAME, config, 0);
    }

    return config;
  }
}
