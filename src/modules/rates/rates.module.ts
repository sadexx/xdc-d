import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Rate } from "src/modules/rates/entities";
import { RatesController } from "src/modules/rates/controllers";
import {
  RateBuilderService,
  CalculationConfigValidatorService,
  DiscountProcessorService,
  RateStepService,
  RateRetrieverService,
  RatesService,
  TimeBoundaryAnalyzerService,
  BlockBuilderService,
  PriceCalculationService,
} from "src/modules/rates/services";

@Module({
  imports: [TypeOrmModule.forFeature([Rate])],
  providers: [
    RateBuilderService,
    RatesService,
    RateStepService,
    CalculationConfigValidatorService,
    TimeBoundaryAnalyzerService,
    RateRetrieverService,
    BlockBuilderService,
    PriceCalculationService,
    DiscountProcessorService,
  ],
  controllers: [RatesController],
  exports: [RatesService],
})
export class RatesModule {}
