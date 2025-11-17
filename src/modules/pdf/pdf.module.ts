import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  PdfBase64ImageConverterService,
  PdfBuilderService,
  PdfService,
  PdfTemplatesService,
} from "src/modules/pdf/services";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Company, InterpreterProfile]), AwsS3Module, EmailsModule],
  providers: [PdfService, PdfBuilderService, PdfTemplatesService, PdfBase64ImageConverterService],
  exports: [PdfService],
})
export class PdfModule {}
