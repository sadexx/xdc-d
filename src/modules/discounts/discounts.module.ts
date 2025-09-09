import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DiscountAssociationsService,
  DiscountHoldersService,
  DiscountQueryOptionsService,
  DiscountsFetchService,
  DiscountsService,
} from "src/modules/discounts/services";
import { DiscountAssociation, DiscountHolder } from "src/modules/discounts/entities";
import { PromoCampaignsModule } from "src/modules/promo-campaigns/promo-campaigns.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";

@Module({
  imports: [TypeOrmModule.forFeature([DiscountHolder, DiscountAssociation]), MembershipsModule, PromoCampaignsModule],
  providers: [
    DiscountsService,
    DiscountHoldersService,
    DiscountQueryOptionsService,
    DiscountAssociationsService,
    DiscountsFetchService,
  ],
  exports: [DiscountsService, DiscountHoldersService],
})
export class DiscountsModule {}
