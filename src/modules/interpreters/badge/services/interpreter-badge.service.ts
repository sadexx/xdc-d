import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateOrUpdateInterpreterBadge } from "src/modules/interpreters/badge/common/dto";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { Repository } from "typeorm";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { PdfBuilderService } from "src/modules/pdf/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { LokiLogger } from "src/common/logger";
import { IS_MEDIA_BUCKET } from "src/common/constants";

@Injectable()
export class InterpreterBadgeService {
  private readonly lokiLogger = new LokiLogger(InterpreterBadgeService.name);

  constructor(
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  public async createOrUpdateInterpreterBadge(
    dto: CreateOrUpdateInterpreterBadge,
    user: ITokenUserData,
  ): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: user.userRoleId } },
      { interpreterBadge: dto.interpreterBadge, interpreterBadgePdf: null },
    );

    this.uploadAndSaveInterpreterBadgePdf(user.userRoleId, dto.interpreterBadge).catch((error: Error) => {
      this.lokiLogger.error(`Failed to upload interpreter badge pdf for userRoleId: ${user.userRoleId}`, error.stack);
    });
  }

  private async uploadAndSaveInterpreterBadgePdf(userRoleId: string, interpreterBadge: string): Promise<void> {
    const interpreterBadgePdf = await this.createOrUpdateInterpreterBadgePdf(userRoleId, interpreterBadge);
    await this.interpreterProfileRepository.update(
      { userRole: { id: userRoleId } },
      { interpreterBadgePdf: interpreterBadgePdf },
    );
  }

  public async createOrUpdateInterpreterBadgePdf(userRoleId: string, interpreterBadge?: string): Promise<string> {
    const interpreterBadgePdf = await this.pdfBuilderService.generateInterpreterBadge(userRoleId, interpreterBadge);
    const interpreterBadgePdfUrl = this.awsS3Service.getMediaObjectUrl(interpreterBadgePdf.interpreterBadgeKey);

    return interpreterBadgePdfUrl;
  }

  public async removeInterpreterBadgePdf(interpreterBadgePdfUrl: string): Promise<void> {
    const key = this.awsS3Service.getKeyFromUrl(interpreterBadgePdfUrl);
    await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
  }
}
