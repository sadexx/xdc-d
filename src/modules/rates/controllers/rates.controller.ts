import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { RatesService } from "src/modules/rates/services";
import {
  AuditPriceDto,
  CalculatePriceDto,
  GenerateRateTableDto,
  GetRateTableDto,
  UpdateRateTableDto,
} from "src/modules/rates/common/dto";
import { BillingSummary } from "src/modules/rates/common/interfaces";
import { ICalculatePriceGetPriceOutput, IConvertedRateOutput } from "src/modules/rates/common/outputs";
import { IMessageOutput } from "src/common/outputs";

@Controller("rates")
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("generate-rate-table")
  async generateRateTable(@Body() dto: GenerateRateTableDto): Promise<Omit<IConvertedRateOutput, "id">[]> {
    return await this.ratesService.generateRateTable(dto.interpreterType, dto.onDemandAudioStandardFirst);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rate-table")
  async getRateTable(
    @Query() dto: GetRateTableDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IConvertedRateOutput[]> {
    return await this.ratesService.getRateTable(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("update-rate-table")
  async updateRateTable(@Body() dto: UpdateRateTableDto): Promise<IMessageOutput> {
    return await this.ratesService.updateRateTable(dto);
  }

  @Post("calculate-preliminary-estimate")
  async calculatePreliminaryEstimate(@Body() dto: CalculatePriceDto): Promise<ICalculatePriceGetPriceOutput> {
    return await this.ratesService.calculatePreliminaryEstimate(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("calculate-detailed-breakdown")
  async calculateDetailedBreakdown(@Body() dto: AuditPriceDto): Promise<BillingSummary> {
    return await this.ratesService.calculateDetailedBreakdown(dto);
  }
}
