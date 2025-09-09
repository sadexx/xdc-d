import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { NotEmptyBodyPipe, OrderLimitPipe } from "src/common/pipes";
import {
  CreateCorporatePromoCampaignDto,
  CreatePersonalPromoCampaignDto,
  GetAllPromoCampaignsDto,
  PromoCampaignAssignmentDto,
  UpdatePromoCampaignDto,
  UploadPromoCampaignBannerDto,
} from "src/modules/promo-campaigns/common/dto";
import {
  PromoCampaignBannersService,
  PromoCampaignsAssignmentService,
  PromoCampaignsService,
} from "src/modules/promo-campaigns/services";
import {
  GetAllPromoCampaignsOutput,
  IUploadPromoCampaignBannerOutput,
} from "src/modules/promo-campaigns/common/outputs";
import { TGetPromoCampaignById, TGetSpecialPromoCampaigns } from "src/modules/promo-campaigns/common/types";
import { UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { CurrentUser } from "src/common/decorators";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { IFile } from "src/modules/file-management/common/interfaces";
import { IMessageOutput } from "src/common/outputs";

@Controller("promo-campaigns")
export class PromoCampaignsController {
  constructor(
    private readonly promoCampaignsService: PromoCampaignsService,
    private readonly promoCampaignsAssignmentService: PromoCampaignsAssignmentService,
    private readonly promoCampaignBannersService: PromoCampaignBannersService,
  ) {}

  @Get()
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  async getAllPromoCampaigns(@Query() dto: GetAllPromoCampaignsDto): Promise<GetAllPromoCampaignsOutput> {
    return this.promoCampaignsService.getAllPromoCampaigns(dto);
  }

  @Get("special")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getSpecialPromoCampaigns(): Promise<TGetSpecialPromoCampaigns[]> {
    return this.promoCampaignsService.getSpecialPromoCampaigns();
  }

  @Get(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getPromoCampaignById(@Param() paramDto: UUIDParamDto): Promise<TGetPromoCampaignById> {
    return this.promoCampaignsService.getPromoCampaignById(paramDto);
  }

  @Post("personal")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createPersonalPromoCampaign(@Body() dto: CreatePersonalPromoCampaignDto): Promise<void> {
    return this.promoCampaignsService.createPersonalPromoCampaign(dto);
  }

  @Post("corporate")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createPersonalMixedPromoCampaign(@Body() dto: CreateCorporatePromoCampaignDto): Promise<void> {
    return this.promoCampaignsService.createCorporatePromoCampaign(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload-banner")
  async uploadDocs(
    @UploadedFile() file: IFile,
    @Query() dto: UploadPromoCampaignBannerDto,
  ): Promise<IUploadPromoCampaignBannerOutput> {
    return this.promoCampaignBannersService.uploadPromoCampaignBanner(file, dto);
  }

  @Patch("assign")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async assignPromoCampaign(
    @Body() dto: PromoCampaignAssignmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void | IMessageOutput> {
    return this.promoCampaignsAssignmentService.assignPromoCampaign(dto, user);
  }

  @Patch(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  async updatePromoCampaign(@Param() paramDto: UUIDParamDto, @Body() dto: UpdatePromoCampaignDto): Promise<void> {
    return this.promoCampaignsService.updatePromoCampaign(paramDto, dto);
  }

  @Delete("unassign")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async unassignPersonalPromoCampaign(
    @Body() dto: PromoCampaignAssignmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.promoCampaignsAssignmentService.unassignPersonalPromoCampaign(dto, user);
  }
}
