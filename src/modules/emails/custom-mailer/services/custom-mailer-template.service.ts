import { BadRequestException, Injectable } from "@nestjs/common";
import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import * as Handlebars from "handlebars";
import { ConfigService } from "@nestjs/config";
import { IAwsConfigS3 } from "src/modules/aws/s3/common/interfaces";
import { EEmailLayoutName, EEmailTemplateName } from "src/modules/emails/common/enums";

@Injectable()
export class CustomMailerTemplateService {
  private readonly layouts: Record<string, Handlebars.TemplateDelegate> = {};
  private readonly bodies: Record<string, Handlebars.TemplateDelegate> = {};
  private readonly mediaBucket: string;

  constructor(private readonly configService: ConfigService) {
    const { s3MediaBucketName } = this.configService.getOrThrow<IAwsConfigS3>("aws");
    this.mediaBucket = s3MediaBucketName;

    const basePath = join(__dirname, "..", "..", "common", "templates");
    const layoutsDirectory = join(basePath, "layouts");
    const bodiesDirectory = join(basePath, "bodies");

    const layoutFiles = readdirSync(layoutsDirectory);

    for (const file of layoutFiles) {
      if (extname(file) !== ".hbs") {
        continue;
      }

      const name = basename(file, ".hbs");
      const filePath = join(layoutsDirectory, file);
      const source = readFileSync(filePath, "utf-8");
      this.layouts[name] = Handlebars.compile(source);
    }

    const bodyFiles = readdirSync(bodiesDirectory);

    for (const file of bodyFiles) {
      if (extname(file) !== ".hbs") {
        continue;
      }

      const name = basename(file, ".hbs");
      const filePath = join(bodiesDirectory, file);
      const source = readFileSync(filePath, "utf-8");
      this.bodies[name] = Handlebars.compile(source);
    }
  }

  public renderTemplate(
    templateName: EEmailTemplateName,
    context: Record<string, string | number | boolean | null | object>,
    layoutName: EEmailLayoutName = EEmailLayoutName.BASE,
  ): string {
    const bodyTemplate = this.bodies[templateName];

    if (!bodyTemplate) {
      throw new BadRequestException(`Body email template not found: ${templateName}`);
    }

    const layoutTemplate = this.layouts[layoutName];

    if (!layoutTemplate) {
      throw new BadRequestException(`Layout email template not found: ${layoutName}`);
    }

    const bodyHtml = bodyTemplate({ ...context, mediaBucket: this.mediaBucket });

    return layoutTemplate({ ...context, mediaBucket: this.mediaBucket, body: bodyHtml });
  }
}
