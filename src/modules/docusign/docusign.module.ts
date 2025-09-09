import { Module } from "@nestjs/common";
import {
  DocusignCorporateService,
  DocusignQueryOptionsService,
  DocusignSdkService,
  DocusignService,
} from "src/modules/docusign/services";
import { DocusignController, DocusignCorporateController } from "src/modules/docusign/controllers";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CorporateContractSigners, DocusignContract } from "src/modules/docusign/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DocusignContract, Company, CorporateContractSigners, UserRole]),
    JwtModule.register({
      global: false,
      signOptions: { expiresIn: "60s", algorithm: "RS256" },
    }),
    AwsS3Module,
    AccountActivationModule,
    AccessControlModule,
  ],
  providers: [DocusignService, DocusignSdkService, DocusignCorporateService, DocusignQueryOptionsService],
  controllers: [DocusignController, DocusignCorporateController],
  exports: [DocusignService, DocusignSdkService],
})
export class DocusignModule {}
