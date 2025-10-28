import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeleteObjectCommandOutput } from "@aws-sdk/client-s3";
import { PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { IFile } from "src/modules/file-management/common/interfaces";
import { UploadPromoCampaignBannerDto } from "src/modules/promo-campaigns/common/dto";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EPromoCampaignBannerType, EPromoCampaignsErrorCodes } from "src/modules/promo-campaigns/common/enums";
import { IS_MEDIA_BUCKET } from "src/common/constants";
import { IUploadPromoCampaignBannerOutput } from "src/modules/promo-campaigns/common/outputs";
import { IPromoCampaignBanner } from "src/modules/promo-campaigns/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { PromoCampaignQueryOptionsService } from "src/modules/promo-campaigns/services";
import {
  TRemoveUnusedPromoCampaignBanners,
  TUpdatePromoCampaignBanner,
  TUpdatePromoCampaignBannerDto,
} from "src/modules/promo-campaigns/common/types";
import { findManyTyped, findOneTyped } from "src/common/utils";
import { ECommonErrorCodes } from "src/common/enums";

@Injectable()
export class PromoCampaignBannersService {
  private readonly lokiLogger = new LokiLogger(PromoCampaignBannersService.name);

  constructor(
    @InjectRepository(PromoCampaignBanner)
    private readonly promoCampaignBannerRepository: Repository<PromoCampaignBanner>,
    private readonly promoCampaignQueryOptionsService: PromoCampaignQueryOptionsService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  public async uploadPromoCampaignBanner(
    file: IFile,
    dto: UploadPromoCampaignBannerDto,
  ): Promise<IUploadPromoCampaignBannerOutput> {
    if (!file) {
      throw new BadRequestException(ECommonErrorCodes.FILE_NOT_RECEIVED);
    }

    if (dto.bannerId) {
      await this.updatePromoCampaignBanner(file, dto as TUpdatePromoCampaignBannerDto);

      return { bannerId: dto.bannerId };
    } else {
      const promoCampaignBanner = await this.constructAndCreatePromoCampaignBanner(file, dto);

      return { bannerId: promoCampaignBanner.id };
    }
  }

  private async updatePromoCampaignBanner(file: IFile, dto: TUpdatePromoCampaignBannerDto): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.updatePromoCampaignBannerOptions(dto.bannerId);
    const promoCampaignBanner = await findOneTyped<TUpdatePromoCampaignBanner>(
      this.promoCampaignBannerRepository,
      queryOptions,
    );

    if (!promoCampaignBanner) {
      await this.awsS3Service.deleteObject(file.key, IS_MEDIA_BUCKET);
      throw new NotFoundException(EPromoCampaignsErrorCodes.BANNER_NOT_FOUND);
    }

    const promoCampaignBannerDto = this.constructPromoCampaignBannerDto(file, dto.promoBannerType);
    await this.promoCampaignBannerRepository.update({ id: dto.bannerId }, promoCampaignBannerDto);

    this.removeOldBannerImage(promoCampaignBanner, dto.promoBannerType).catch((error: Error) => {
      this.lokiLogger.error(`Failed to remove promo banner image for bannerId: ${promoCampaignBanner.id}`, error.stack);
    });
  }

  private async constructAndCreatePromoCampaignBanner(
    file: IFile,
    dto: UploadPromoCampaignBannerDto,
  ): Promise<PromoCampaignBanner> {
    const promoCampaignBannerDto = this.constructPromoCampaignBannerDto(file, dto.promoBannerType);

    return await this.createPromoCampaignBanner(promoCampaignBannerDto);
  }

  private async createPromoCampaignBanner(dto: IPromoCampaignBanner): Promise<PromoCampaignBanner> {
    const newPromoCampaignBannerDto = this.promoCampaignBannerRepository.create(dto);

    return await this.promoCampaignBannerRepository.save(newPromoCampaignBannerDto);
  }

  private constructPromoCampaignBannerDto(file: IFile, type: EPromoCampaignBannerType): IPromoCampaignBanner {
    const bannerUrl = this.awsS3Service.getMediaObjectUrl(file.key);
    const fieldName = this.getBannerImageFieldName(type);

    return { [fieldName]: bannerUrl };
  }

  private async removeOldBannerImage(
    promoCampaignBanner: TUpdatePromoCampaignBanner,
    type: EPromoCampaignBannerType,
  ): Promise<void> {
    const fieldName = this.getBannerImageFieldName(type);
    const bannerUrl = promoCampaignBanner[fieldName];

    if (bannerUrl) {
      const key = this.awsS3Service.getKeyFromUrl(bannerUrl);
      await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
    }
  }

  private getBannerImageFieldName(type: EPromoCampaignBannerType): keyof IPromoCampaignBanner {
    switch (type) {
      case EPromoCampaignBannerType.MOBILE:
        return "mobileBannerUrl";
      case EPromoCampaignBannerType.TABLET:
        return "tabletBannerUrl";
      case EPromoCampaignBannerType.WEB:
        return "webBannerUrl";
    }
  }

  public async updateBannerRelationship(promoCampaignId: string, bannerId: string): Promise<void> {
    await this.promoCampaignBannerRepository.update(
      { promoCampaign: { id: promoCampaignId } },
      { promoCampaign: null },
    );
    await this.promoCampaignBannerRepository.update({ id: bannerId }, { promoCampaign: { id: promoCampaignId } });
  }

  public async removeUnusedPromoCampaignBanners(): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.removeUnusedPromoCampaignBannersOptions();
    const promoCampaignBanners = await findManyTyped<TRemoveUnusedPromoCampaignBanners[]>(
      this.promoCampaignBannerRepository,
      queryOptions,
    );

    for (const promoCampaignBanner of promoCampaignBanners) {
      await this.removePromoCampaignBannerFiles(promoCampaignBanner);
    }

    await this.promoCampaignBannerRepository.remove(promoCampaignBanners as PromoCampaignBanner[]);
  }

  public async removePromoCampaignBannerFiles(promoCampaignBanner: TRemoveUnusedPromoCampaignBanners): Promise<void> {
    const removePromises: Promise<DeleteObjectCommandOutput>[] = [];

    if (promoCampaignBanner.mobileBannerUrl) {
      const key = this.awsS3Service.getKeyFromUrl(promoCampaignBanner.mobileBannerUrl);
      removePromises.push(this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET));
    }

    if (promoCampaignBanner.tabletBannerUrl) {
      const key = this.awsS3Service.getKeyFromUrl(promoCampaignBanner.tabletBannerUrl);
      removePromises.push(this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET));
    }

    if (promoCampaignBanner.webBannerUrl) {
      const key = this.awsS3Service.getKeyFromUrl(promoCampaignBanner.webBannerUrl);
      removePromises.push(this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET));
    }

    await Promise.allSettled(removePromises);
  }
}
