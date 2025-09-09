import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Transporter } from "nodemailer";
import SMTPPool from "nodemailer/lib/smtp-pool";
import { CustomMailerTemplateService } from "src/modules/emails/custom-mailer/services";
import { EEmailLayoutName, EEmailTemplateName } from "src/modules/emails/common/enums";

@Injectable()
export class CustomMailerService {
  private readonly FROM: string;

  constructor(
    @Inject("MAILER_TRANSPORT") private readonly transporter: Transporter<SMTPPool.SentMessageInfo>,
    private readonly configService: ConfigService,
    private readonly customMailerTemplateService: CustomMailerTemplateService,
  ) {
    this.FROM = `"${this.configService.getOrThrow<string>(
      "EMAIL_AUTHOR_NAME",
    )}" <${this.configService.getOrThrow<string>("EMAIL_AUTHOR")}>`;
  }

  public async sendMail(options: {
    to: string;
    subject: string;
    templateName: EEmailTemplateName;
    context: Record<string, string | number | boolean | null | object>;
    layoutName?: EEmailLayoutName;
  }): Promise<void> {
    const html = this.customMailerTemplateService.renderTemplate(
      options.templateName,
      options.context,
      options.layoutName,
    );
    await this.transporter.sendMail({
      ...options,
      from: this.FROM,
      html,
    });
  }
}
