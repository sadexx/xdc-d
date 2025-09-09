import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";
import SMTPPool from "nodemailer/lib/smtp-pool";
import { SMTP_SECURE_PORT } from "src/common/constants";
import { MAILER_TRANSPORT } from "src/modules/emails/common/constants";
import { CustomMailerService, CustomMailerTemplateService } from "src/modules/emails/custom-mailer/services";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAILER_TRANSPORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Transporter<SMTPPool.MailOptions> => {
        const transporter = createTransport({
          host: configService.getOrThrow<string>("EMAIL_HOST"),
          port: configService.getOrThrow<number>("EMAIL_PORT"),
          secure: configService.getOrThrow<number>("EMAIL_PORT") === SMTP_SECURE_PORT,
          auth: {
            user: configService.getOrThrow<string>("EMAIL_USER"),
            pass: configService.getOrThrow<string>("EMAIL_PASSWORD"),
          },
        });

        return transporter;
      },
    },
    CustomMailerService,
    CustomMailerTemplateService,
  ],
  exports: [CustomMailerService],
})
export class CustomMailerModule {}
