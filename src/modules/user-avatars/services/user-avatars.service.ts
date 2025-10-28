import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EUserGender, EUserRoleName } from "src/modules/users/common/enums";
import { NotificationService } from "src/modules/notifications/services";
import { UserAvatarsManualDecisionDto } from "src/modules/user-avatars/common/dto";
import { EAvatarStatus } from "src/modules/user-avatars/common/enums";
import { avatarMap } from "src/modules/user-avatars/common/constants/constants";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";
import { SessionsService } from "src/modules/sessions/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { LokiLogger } from "src/common/logger";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import { UserRole } from "src/modules/users/entities";
import { HelperService } from "src/modules/helper/services";
import { EmailsService } from "src/modules/emails/services";
import { ConfigService } from "@nestjs/config";
import { IFile } from "src/modules/file-management/common/interfaces";
import { IS_MEDIA_BUCKET } from "src/common/constants";
import {
  GetAvatarRequestByUserIdQuery,
  HandleUserAvatarUploadQuery,
  HandleUserAvatarUploadUserQuery,
  RemoveAvatarQuery,
  TGetAvatarRequestByUserId,
  THandleAdminAvatarUpload,
  THandleUserAvatarUpload,
  THandleUserAvatarUploadUser,
  TProcessUserAvatarRequest,
  TRemoveAvatar,
  TUserAvatarManualDecision,
  UserAvatarManualDecisionQuery,
} from "src/modules/user-avatars/common/types";
import { RedisService } from "src/modules/redis/services";
import { ECommonErrorCodes } from "src/common/enums";

@Injectable()
export class UserAvatarsService {
  private readonly lokiLogger = new LokiLogger(UserAvatarsService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(UserAvatarRequest)
    private readonly userAvatarsRepository: Repository<UserAvatarRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly awsS3Service: AwsS3Service,
    private readonly notificationService: NotificationService,
    private readonly sessionsService: SessionsService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly helperService: HelperService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getAvatarRequestByUserId(userId: string): Promise<TGetAvatarRequestByUserId> {
    return await findOneOrFailTyped<TGetAvatarRequestByUserId>(
      userId,
      this.userAvatarsRepository,
      { select: GetAvatarRequestByUserIdQuery.select, where: { user: { id: userId } } },
      "userId",
    );
  }

  public async uploadAvatar(user: ITokenUserData, file: IFile): Promise<IMessageOutput> {
    if (!file) {
      throw new BadRequestException(ECommonErrorCodes.FILE_NOT_RECEIVED);
    }

    if (user.role === EUserRoleName.SUPER_ADMIN) {
      await this.handleAdminAvatarUpload(user, file.key);
    } else {
      await this.handleUserAvatarUpload(user, file.key);
    }

    return { message: "Avatar uploaded successfully." };
  }

  private async handleAdminAvatarUpload(user: ITokenUserData, fileKey: string): Promise<void> {
    const existingUser = await findOneOrFailTyped<THandleAdminAvatarUpload>(user.id, this.userRepository, {
      select: HandleUserAvatarUploadQuery.select,
      where: { id: user.id },
    });

    if (!existingUser.isDefaultAvatar && existingUser.avatarUrl) {
      await this.removeAvatarFromS3(existingUser.avatarUrl);
    }

    await this.userRepository.update(user.id, {
      avatarUrl: this.awsS3Service.getMediaObjectUrl(fileKey),
      isDefaultAvatar: false,
    });
  }

  private async handleUserAvatarUpload(user: ITokenUserData, fileKey: string): Promise<void> {
    const userAvatarRequest = await findOneTyped<THandleUserAvatarUpload>(this.userAvatarsRepository, {
      select: HandleUserAvatarUploadQuery.select,
      where: { user: { id: user.id } },
    });
    const existingUser = await findOneOrFailTyped<THandleUserAvatarUploadUser>(user.id, this.userRepository, {
      select: HandleUserAvatarUploadUserQuery.select,
      where: { id: user.id },
    });

    if (userAvatarRequest && userAvatarRequest.avatarUrl) {
      await this.removeAvatarFromS3(userAvatarRequest.avatarUrl);
      await this.userAvatarsRepository.delete(userAvatarRequest.id);
    }

    const newUserAvatarRequest = this.userAvatarsRepository.create({
      user: existingUser,
      avatarUrl: this.awsS3Service.getMediaObjectUrl(fileKey),
    });
    await this.userAvatarsRepository.save(newUserAvatarRequest);

    void this.sendEmailsToAdminsInBackground(existingUser.platformId || "", user.userRoleId).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send avatar verification emails to admins:`, error.stack);
    });
  }

  public async userAvatarManualDecision(dto: UserAvatarsManualDecisionDto): Promise<void> {
    const userAvatarRequest = await findOneOrFailTyped<TUserAvatarManualDecision>(dto.id, this.userAvatarsRepository, {
      select: UserAvatarManualDecisionQuery.select,
      where: { id: dto.id },
      relations: UserAvatarManualDecisionQuery.relations,
    });

    const lastSession = await this.sessionsService.getLastSession(userAvatarRequest.user.id);
    const userRole = userAvatarRequest.user.userRoles.find((userRole) => userRole.id === lastSession?.userRoleId);

    if (dto.status === EAvatarStatus.VERIFIED) {
      await this.processVerifiedAvatar(userAvatarRequest, userRole);
    }

    if (dto.status === EAvatarStatus.DECLINED) {
      await this.processDeclinedAvatar(userAvatarRequest, dto, userRole);
    }
  }

  private async processVerifiedAvatar(
    userAvatarRequest: TUserAvatarManualDecision,
    userRole?: TProcessUserAvatarRequest,
  ): Promise<void> {
    if (!userAvatarRequest.user.isDefaultAvatar && userAvatarRequest.user.avatarUrl) {
      await this.removeAvatarFromS3(userAvatarRequest.user.avatarUrl);
    }

    await this.userRepository.update(userAvatarRequest.user.id, {
      avatarUrl: userAvatarRequest.avatarUrl,
      isDefaultAvatar: false,
    });
    await this.userAvatarsRepository.delete(userAvatarRequest.id);

    if (userRole) {
      await this.sendAvatarVerifiedNotification(userRole.id);

      if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
        await this.invalidateInterpreterBadgeAvatarCache(userRole.id);
        this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
          this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
        });
      }
    }
  }

  private async processDeclinedAvatar(
    userAvatarRequest: TUserAvatarManualDecision,
    dto: UserAvatarsManualDecisionDto,
    userRole?: TProcessUserAvatarRequest,
  ): Promise<void> {
    if (userAvatarRequest.avatarUrl) {
      await this.removeAvatarFromS3(userAvatarRequest.avatarUrl);
    }

    await this.userAvatarsRepository.delete(userAvatarRequest.id);

    if (userRole && dto.declineReason) {
      await this.sendAvatarDeclinedNotification(userRole.id, dto.declineReason);
    }
  }

  public async removeAvatar(user: ITokenUserData): Promise<IMessageOutput> {
    const userRole = await findOneOrFailTyped<TRemoveAvatar>(user.id, this.userRoleRepository, {
      select: RemoveAvatarQuery.select,
      where: { id: user.userRoleId },
      relations: RemoveAvatarQuery.relations,
    });

    if (!userRole.user.isDefaultAvatar && userRole.user.avatarUrl) {
      await this.removeAvatarFromS3(userRole.user.avatarUrl);
    }

    await this.setDefaultUserAvatar(user.id, userRole.profile.gender);

    if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
      await this.invalidateInterpreterBadgeAvatarCache(userRole.id);
      this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
      });
    }

    return { message: "Avatar removed successfully." };
  }

  public async removeAvatarFromS3(url: string): Promise<void> {
    const key = this.awsS3Service.getKeyFromUrl(url);
    await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
  }

  public async setDefaultUserAvatar(id: string, gender: EUserGender = EUserGender.OTHER): Promise<void> {
    const avatarKey = avatarMap[gender];
    await this.userRepository.update(id, {
      avatarUrl: this.awsS3Service.getMediaObjectUrl(avatarKey),
      isDefaultAvatar: true,
    });
  }

  private async sendEmailsToAdminsInBackground(platformId: string, userRoleId: string): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();
    const userProfileLink = `${this.FRONT_END_URL}/members/details/${userRoleId}/personal-data`;

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendUserAvatarAdminNotifyEmail(superAdmin.email, platformId, userProfileLink);
    }
  }

  private async invalidateInterpreterBadgeAvatarCache(userRoleId: string): Promise<void> {
    const cacheKey = `base64avatar:${userRoleId}`;
    await this.redisService.del(cacheKey);
  }

  private async sendAvatarVerifiedNotification(userRoleId: string): Promise<void> {
    this.notificationService.sendAvatarVerifiedNotification(userRoleId).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send avatar verified notification for userId: ${userRoleId}`, error.stack);
    });
  }

  private async sendAvatarDeclinedNotification(userRoleId: string, declineReason: string): Promise<void> {
    this.notificationService.sendAvatarDeclinedNotification(userRoleId, declineReason).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send avatar declined notification for userId: ${userRoleId}`, error.stack);
    });
  }
}
