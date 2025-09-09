import { Module } from "@nestjs/common";
import { AwsSQSModule } from "src/modules/aws/sqs/aws-sqs.module";
import { ContentManagementModule } from "src/modules/content-management/content-management.module";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { UiLanguagesModule } from "src/modules/ui-languages/ui-languages.module";
import { AppInitializerService } from "src/modules/app-initializer/app-initializer.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "src/modules/users/entities";
import { PermissionsModule } from "src/modules/permissions/permissions.module";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { RatesModule } from "src/modules/rates/rates.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { SettingsModule } from "src/modules/settings/settings.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]),
    AwsSQSModule,
    ContentManagementModule,
    CompaniesModule,
    UiLanguagesModule,
    PermissionsModule,
    ChimeMessagingConfigurationModule,
    RatesModule,
    MembershipsModule,
    SettingsModule,
  ],
  providers: [AppInitializerService],
  exports: [AppInitializerService],
})
export class AppInitializerModule {}
