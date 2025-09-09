import { Module } from "@nestjs/common";
import {
  PdfBase64ImageConverterService,
  PdfBuilderService,
  PdfService,
  PdfTemplatesService,
} from "src/modules/pdf/services";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OldPayment } from "src/modules/payments/entities";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { OldRatesModule } from "src/modules/rates-old/old-rates.module";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([OldPayment, UserRole, Company]),
    AwsS3Module,
    HelperModule,
    OldRatesModule,
    RedisModule,
  ],
  providers: [PdfService, PdfBuilderService, PdfTemplatesService, PdfBase64ImageConverterService],
  exports: [PdfBuilderService],
})
export class PdfModule {}
