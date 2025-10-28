import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PdfBuilderService, PdfService, PdfTemplatesService } from "src/modules/pdf-new/services";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments-new/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { EmailsModule } from "src/modules/emails/emails.module";

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Company]), AwsS3Module, EmailsModule],
  providers: [PdfService, PdfBuilderService, PdfTemplatesService],
  exports: [PdfService],
})
export class PdfModuleNew {}
