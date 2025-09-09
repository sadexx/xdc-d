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
import { ConcessionCardService } from "src/modules/concession-card/services";
import {
  ConcessionCardManualDecisionDto,
  GetConcessionCardDto,
  RemoveConcessionCardDto,
  SetConcessionCardDto,
  UpdateConcessionCardDto,
} from "src/modules/concession-card/common/dto";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { UUIDParamDto } from "src/common/dto";
import { GetConcessionCardOutput, SetConcessionCardOutput } from "src/modules/concession-card/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { IFile } from "src/modules/file-management/common/interfaces";

@Controller("concession-card")
export class ConcessionCardController {
  constructor(private readonly concessionCardService: ConcessionCardService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post()
  async createConcessionCard(
    @Body() dto: SetConcessionCardDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<SetConcessionCardOutput> {
    return this.concessionCardService.createConcessionCard(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload-docs")
  async uploadFileToConcessionCard(
    @Query() { id }: UUIDParamDto,
    @UploadedFile() file: IFile,
    @CurrentUser() user: ITokenUserData,
  ): Promise<SetConcessionCardOutput> {
    return this.concessionCardService.uploadFileToConcessionCard(id, user, file);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Patch()
  async updateConcessionCard(
    @Query() dto: UpdateConcessionCardDto,
    @UploadedFile() file: IFile,
  ): Promise<IMessageOutput> {
    return this.concessionCardService.updateConcessionCard(dto, file);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get()
  async getConcessionCard(
    @Query() dto: GetConcessionCardDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetConcessionCardOutput | null> {
    return this.concessionCardService.getConcessionCard(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("manual-decision")
  async concessionCardManualDecision(
    @Body() dto: ConcessionCardManualDecisionDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.concessionCardService.concessionCardManualDecision(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async removeConcessionCard(@Query() { id }: RemoveConcessionCardDto): Promise<void> {
    return this.concessionCardService.removeConcessionCard(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-file")
  async removeConcessionCardFile(
    @Query() { id }: RemoveConcessionCardDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.concessionCardService.removeConcessionCardFile(id, user);
  }
}
