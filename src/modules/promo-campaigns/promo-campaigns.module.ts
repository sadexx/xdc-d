import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  PromoCampaignBannersService,
  PromoCampaignQueryOptionsService,
  PromoCampaignsAssignmentService,
  PromoCampaignsService,
  PromoCampaignsUsageService,
  PromoCampaignsValidationService,
} from "src/modules/promo-campaigns/services";
import { PromoCampaign, PromoCampaignAssignment, PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { PromoCampaignsController } from "src/modules/promo-campaigns/controllers";
import { FileManagementModule } from "src/modules/file-management/file-management.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCampaign, PromoCampaignAssignment, PromoCampaignBanner, UserRole, Company]),
    forwardRef(() => DiscountsModule),
    AccessControlModule,
    AwsS3Module,
    FileManagementModule,
  ],
  controllers: [PromoCampaignsController],
  providers: [
    PromoCampaignsService,
    PromoCampaignsAssignmentService,
    PromoCampaignBannersService,
    PromoCampaignsValidationService,
    PromoCampaignQueryOptionsService,
    PromoCampaignsUsageService,
  ],
  exports: [
    PromoCampaignsUsageService,
    PromoCampaignsValidationService,
    PromoCampaignsAssignmentService,
    PromoCampaignBannersService,
    PromoCampaignsService,
  ],
})
export class PromoCampaignsModule {}
