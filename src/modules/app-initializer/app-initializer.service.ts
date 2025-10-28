import { Injectable, OnModuleInit } from "@nestjs/common";
import { WebhookService } from "src/modules/aws/sqs/services";
import { ContentManagementService } from "src/modules/content-management/services";
import { CompaniesService } from "src/modules/companies/services";
import { seedDatabaseTableFromEnum, setDataSource } from "src/common/utils";
import { DataSource, Repository } from "typeorm";
import { UiLanguagesService } from "src/modules/ui-languages/services";
import { EUserRoleName } from "src/modules/users/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { Role } from "src/modules/users/entities";
import { PermissionsService } from "src/modules/permissions/services";
import { APP_INSTANCE_NAME, IS_LOCAL } from "src/common/constants";
import { MessagingIdentityService } from "src/modules/chime-messaging-configuration/services";
import { ConfigService } from "@nestjs/config";
import { RatesService } from "src/modules/rates/services";
import { MembershipsService } from "src/modules/memberships/services";
import { SettingsService } from "src/modules/settings/services";

@Injectable()
export class AppInitializerService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly webhookService: WebhookService,
    private readonly contentManagementService: ContentManagementService,
    private readonly companiesService: CompaniesService,
    private readonly dataSource: DataSource,
    private readonly uiLanguagesService: UiLanguagesService,
    private readonly permissionsService: PermissionsService,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly ratesService: RatesService,
    private readonly configService: ConfigService,
    private readonly membershipsService: MembershipsService,
    private readonly settingsService: SettingsService,
  ) {
    setDataSource(this.dataSource);
  }

  async onModuleInit(): Promise<void> {
    const firstLaunch = this.configService.getOrThrow<boolean>("firstLaunch");
    await this.permissionsService.seedPermissions();

    if (firstLaunch) {
      await seedDatabaseTableFromEnum(this.roleRepository, EUserRoleName, "user roles");
      await this.contentManagementService.seedDatabaseFromSeedData();
      await this.uiLanguagesService.seedDatabaseFromSeedData();
      await this.companiesService.seedLfhCompanyToDatabase();
      await this.messagingIdentityService.createAppInstance(APP_INSTANCE_NAME);
      await this.ratesService.seedRatesToDatabase();
      await this.membershipsService.seedMembershipsToDatabase();
      await this.settingsService.seedSettingsToDatabase();
    }

    if (!IS_LOCAL) {
      await this.webhookService.startCheckStatusWebhook();
    }
  }
}
