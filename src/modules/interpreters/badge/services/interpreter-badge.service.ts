import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateOrUpdateInterpreterBadge } from "src/modules/interpreters/badge/common/dto";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { Repository } from "typeorm";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { IS_MEDIA_BUCKET } from "src/common/constants";
import { UserRole } from "src/modules/users/entities";
import { findOneOrFailTyped } from "src/common/utils";
import {
  CreateOrUpdateInterpreterBadgePdfQuery,
  TCreateOrUpdateInterpreterBadgePdf,
} from "src/modules/interpreters/badge/common/types";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class InterpreterBadgeService {
  constructor(
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly awsS3Service: AwsS3Service,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async createOrUpdateInterpreterBadge(
    dto: CreateOrUpdateInterpreterBadge,
    user: ITokenUserData,
  ): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: user.userRoleId } },
      { interpreterBadge: dto.interpreterBadge, interpreterBadgePdf: null },
    );

    await this.createOrUpdateInterpreterBadgePdf(user.userRoleId, dto.interpreterBadge);
  }

  public async createOrUpdateInterpreterBadgePdf(userRoleId: string, interpreterBadge?: string): Promise<void> {
    const userRole = await findOneOrFailTyped<TCreateOrUpdateInterpreterBadgePdf>(userRoleId, this.userRoleRepository, {
      select: CreateOrUpdateInterpreterBadgePdfQuery.select,
      where: { id: userRoleId },
      relations: CreateOrUpdateInterpreterBadgePdfQuery.relations,
    });

    await this.queueInitializeService.addProcessInterpreterBadgeGenerationQueue({
      userRole,
      newInterpreterBadge: interpreterBadge,
    });
  }

  public async removeInterpreterBadgePdf(interpreterBadgePdfUrl: string): Promise<void> {
    const key = this.awsS3Service.getKeyFromUrl(interpreterBadgePdfUrl);
    await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
  }
}
