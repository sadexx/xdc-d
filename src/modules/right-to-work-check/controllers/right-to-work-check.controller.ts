import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { RightToWorkCheckService } from "src/modules/right-to-work-check/services";
import {
  CreateRightToWorkCheckDto,
  EditRightToWorkCheckDto,
  GetAllRightToWorkChecksDto,
  RightToWorkCheckManualDecisionDto,
} from "src/modules/right-to-work-check/common/dto";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import {
  CreateRightToWorkCheckOutput,
  EditRightToWorkCheckOutput,
  GetRightToWorkCheckOutput,
} from "src/modules/right-to-work-check/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IFile } from "src/modules/file-management/common/interfaces";

@Controller("right-to-work-check")
export class RightToWorkCheckController {
  constructor(private readonly rightToWorkCheckService: RightToWorkCheckService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post()
  async createRightToWorkCheck(
    @Body() dto: CreateRightToWorkCheckDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CreateRightToWorkCheckOutput> {
    return this.rightToWorkCheckService.createRightToWorkCheck(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload-docs")
  async uploadFileToRightToWorkCheck(
    @Query() { id }: UUIDParamDto,
    @UploadedFile() file: IFile,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CreateRightToWorkCheckOutput> {
    return this.rightToWorkCheckService.uploadFileToRightToWorkCheck(id, user, file);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Patch()
  async editRightToWorkCheck(
    @Query() dto: EditRightToWorkCheckDto,
    @UploadedFile() file: IFile,
    @CurrentUser() user: ITokenUserData,
  ): Promise<EditRightToWorkCheckOutput> {
    return this.rightToWorkCheckService.editRightToWorkCheck(dto, user, file);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get()
  async getAllRightToWorkChecks(
    @Query() dto: GetAllRightToWorkChecksDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<RightToWorkCheck[]> {
    return this.rightToWorkCheckService.getAllRightToWorkChecks(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("get-by-id")
  async getRightToWorkCheck(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<GetRightToWorkCheckOutput | null> {
    return this.rightToWorkCheckService.getRightToWorkCheck(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("manual-decision")
  async rightToWorkCheckManualDecision(
    @Body() dto: RightToWorkCheckManualDecisionDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.rightToWorkCheckService.rightToWorkCheckManualDecision(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async removeRightToWorkCheck(@Query() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.rightToWorkCheckService.removeRightToWorkCheck(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-file")
  async removeRightToWorkFile(@Query() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.rightToWorkCheckService.removeRightToWorkFile(id, user);
  }
}
