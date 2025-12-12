import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigModuleOptions } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { loadEnv } from "src/config";
import { validate } from "src/config/env";
import { typeOrmConfig } from "typeorm.config";
import { HttpRequestDurationInterceptor, HttpLoggingInterceptor } from "src/common/interceptors";
import { MetricsMiddleware } from "src/common/middlewares";
import { GlobalExceptionFilter } from "src/common/filters";
import { EmailsModule } from "src/modules/emails/emails.module";
import { UsersModule } from "src/modules/users/users.module";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { AwsPinpointModule } from "src/modules/aws/pinpoint/aws-pinpoint.module";
import { AbnModule } from "src/modules/abn/abn.module";
import { RedisModule } from "src/modules/redis/redis.module";
import { HealthModule } from "src/modules/health/health.module";
import { AuthModule } from "src/modules/auth/auth.module";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { UiLanguagesModule } from "src/modules/ui-languages/ui-languages.module";
import { NaatiModule } from "src/modules/naati/naati.module";
import { SumSubModule } from "src/modules/sumsub/sumsub.module";
import { AppInitializerModule } from "src/modules/app-initializer/app-initializer.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { DocusignModule } from "src/modules/docusign/docusign.module";
import { ContentManagementModule } from "src/modules/content-management/content-management.module";
import { BackyCheckModule } from "src/modules/backy-check/backy-check.module";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { IeltsModule } from "src/modules/ielts/ielts.module";
import { ConcessionCardModule } from "src/modules/concession-card/concession-card.module";
import { ContactFormModule } from "src/modules/contact-form/contact-form.module";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { RightToWorkCheckModule } from "src/modules/right-to-work-check/right-to-work-check.module";
import { AppointmentOrdersModule } from "src/modules/appointment-orders/appointment-order/appointment-orders.module";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { AdminModule } from "src/modules/admin/admin.module";
import { WebSocketGatewayModule } from "src/modules/web-socket-gateway/web-socket-gateway.module";
import { CustomPrometheusModule } from "src/modules/prometheus/prometheus.module";
import { MultiWayParticipantModule } from "src/modules/multi-way-participant/multi-way-participant.module";
import { PermissionsModule } from "src/modules/permissions/permissions.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { InterpreterQuestionnaireModule } from "src/modules/interpreters/questionnaire/interpreter-questionnaire.module";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { StatisticsModule } from "src/modules/statistics/statistics.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { UserAvatarsModule } from "src/modules/user-avatars/user-avatars.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import { ToolboxModule } from "src/modules/toolbox/toolbox.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { PromoCampaignsModule } from "src/modules/promo-campaigns/promo-campaigns.module";
import { DraftAppointmentsModule } from "src/modules/draft-appointments/draft-appointments.module";
import { RatesModule } from "src/modules/rates/rates.module";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { RemovalModule } from "src/modules/removal/removal.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { BlacklistModule } from "src/modules/blacklists/blacklists.module";
import { QueueModule } from "src/modules/queues/queues.module";
import { QueueProcessorsModule } from "src/modules/queue-processors/queue-processors.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointments/failed-payment-cancel/appointment-failed-payment-cancel.module";
import { LanguageDocCheckModule } from "src/modules/language-doc-check/language-doc-check.module";
import { AddressesModule } from "src/modules/addresses/addresses.module";
import { ArchiveAudioRecordsModule } from "src/modules/archive-audio-records/archive-audio-records.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { PaymentInformationModule } from "src/modules/payment-information/payment-information.module";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";
import { CsvModule } from "src/modules/csv/csv.module";
import { QueueProcessorBridgeModule } from "src/modules/queue-processor-bridge/queue-processor-bridge.module";
import { WebhookProcessorModule } from "src/modules/webhook-processor/webhook-processor.module";
import { TaskExecutionModule } from "src/modules/task-execution/task-execution.module";
import { AwsConfigModule } from "src/modules/aws/config/aws-config.module";
import { HttpClientModule } from "src/modules/http-client/http-client.module";
import { DataTransferModule } from "src/modules/data-transfer/data-transfer.module";
import { UrlShortenerModule } from "src/modules/url-shortener/url-shortener.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { SettingsModule } from "src/modules/settings/settings.module";
import { PaymentAnalysisModule } from "src/modules/payments-analysis/payments-analysis.module";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { PdfModule } from "src/modules/pdf/pdf.module";
import { ScriptikModule } from "src/modules/scriptik/scriptik.module";

const configModuleOptions: ConfigModuleOptions = {
  envFilePath: [".env"],
  isGlobal: true,
  load: [loadEnv],
  validate,
};

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    TypeOrmModule.forRoot(typeOrmConfig as TypeOrmModuleOptions),
    AppInitializerModule,
    RedisModule,
    CustomPrometheusModule,
    AwsConfigModule,
    QueueProcessorBridgeModule,
    QueueModule,
    QueueProcessorsModule,
    PermissionsModule,
    TokensModule,
    FileManagementModule,
    HealthModule,
    HttpClientModule,
    EmailsModule,
    WebSocketGatewayModule,
    AwsPinpointModule,
    AccessControlModule,
    HelperModule,
    AuthModule,
    TaskExecutionModule,
    SettingsModule,
    UsersModule,
    ChimeMeetingConfigurationModule,
    ChimeMessagingConfigurationModule,
    AppointmentsModule,
    AppointmentOrdersModule,
    NaatiModule,
    AbnModule,
    UiLanguagesModule,
    InterpreterQuestionnaireModule,
    SumSubModule,
    DocusignModule,
    ContentManagementModule,
    InterpreterProfileModule,
    IeltsModule,
    BackyCheckModule,
    ConcessionCardModule,
    ContactFormModule,
    LanguageDocCheckModule,
    AccountActivationModule,
    RightToWorkCheckModule,
    CompaniesModule,
    AdminModule,
    MultiWayParticipantModule,
    StatisticsModule,
    NotificationModule,
    StripeModule,
    UserAvatarsModule,
    PaypalModule,
    ToolboxModule,
    DiscountsModule,
    PromoCampaignsModule,
    DraftAppointmentsModule,
    RatesModule,
    InterpreterBadgeModule,
    RemovalModule,
    MembershipsModule,
    BlacklistModule,
    AppointmentFailedPaymentCancelModule,
    AddressesModule,
    ArchiveAudioRecordsModule,
    PaymentInformationModule,
    CompaniesDepositChargeModule,
    CsvModule,
    WebhookProcessorModule,
    DataTransferModule,
    UrlShortenerModule,
    PaymentAnalysisModule,
    PaymentsModule,
    PdfModule,
    ScriptikModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRequestDurationInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes("*splat");
  }
}
