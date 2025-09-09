import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ESortOrder } from "src/common/enums";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { CreatePromoDto, UpdateContentManagementDto, UpdatePromoDto } from "src/modules/content-management/common/dto";
import { ELandingUiLanguage, EPromoAndReviewOrder } from "src/modules/content-management/common/enums";
import { ContentManagement, Promo } from "src/modules/content-management/entities";
import { seedDataContentManagement } from "src/modules/content-management/seed-data/seed-data";
import { ReviewsService } from "src/modules/reviews/services";
import { Repository } from "typeorm";
import { RedisService } from "src/modules/redis/services";
import { SaveImageOutput } from "src/modules/content-management/common/outputs";
import { IMessageOutput } from "src/common/outputs";
import { IFile } from "src/modules/file-management/common/interfaces";
import { IS_MEDIA_BUCKET } from "src/common/constants";

@Injectable()
export class ContentManagementService {
  constructor(
    @InjectRepository(Promo)
    private readonly promoRepository: Repository<Promo>,
    @InjectRepository(ContentManagement)
    private readonly contentManagementRepository: Repository<ContentManagement>,
    private readonly awsS3Service: AwsS3Service,
    private readonly reviewsService: ReviewsService,
    private readonly redisService: RedisService,
  ) {}

  public async seedDatabaseFromSeedData(): Promise<void> {
    const contentManagements = await this.contentManagementRepository.find();

    if (contentManagements.length === 0) {
      await this.contentManagementRepository.save(seedDataContentManagement);
    }
  }

  public async createPromo(createPromoDto: CreatePromoDto): Promise<Promo> {
    if (createPromoDto.language !== ELandingUiLanguage.ENGLISH) {
      const englishPromo = await this.getOnePromoByLanguageAndOrdinalNumber(
        ELandingUiLanguage.ENGLISH,
        createPromoDto.ordinalNumber,
      );

      if (englishPromo) {
        createPromoDto.image = englishPromo.image as string;
      }

      if (!englishPromo) {
        throw new BadRequestException("You must create an English record first.");
      }
    }

    if (createPromoDto.language === ELandingUiLanguage.ENGLISH && !createPromoDto.image) {
      throw new BadRequestException("You must create an image for English record first.");
    }

    const promoWithSameLanguageAndOrdinalNumber = await this.getOnePromoByLanguageAndOrdinalNumber(
      createPromoDto.language,
      createPromoDto.ordinalNumber,
    );

    if (promoWithSameLanguageAndOrdinalNumber) {
      throw new BadRequestException("The record with this ordinal number and language already exists.");
    }

    const promo = this.promoRepository.create(createPromoDto);
    const savedPromo = await this.promoRepository.save(promo);

    await this.updateContentManagementByPromoId(createPromoDto.language, savedPromo);
    await this.invalidateCacheForLanguage(createPromoDto.language);

    return savedPromo;
  }

  public async getOnePromoById(id: string): Promise<Promo> {
    const promo = await this.promoRepository.findOne({
      select: { contentManagement: { language: true } },
      where: { id },
      relations: { contentManagement: true },
    });

    if (!promo) {
      throw new NotFoundException("Promo not found.");
    }

    return promo;
  }

  private async getOnePromoByLanguageAndOrdinalNumber(
    language: ELandingUiLanguage,
    ordinalNumber: EPromoAndReviewOrder,
  ): Promise<Promo | null> {
    return this.promoRepository.findOne({
      where: {
        ordinalNumber,
        contentManagement: {
          language,
        },
      },
      relations: { contentManagement: true },
    });
  }

  public async deletePromoById(id: string, language: ELandingUiLanguage): Promise<void> {
    const promo = await this.getOnePromoById(id);

    if (promo.image && language === ELandingUiLanguage.ENGLISH) {
      await this.deleteImageFromS3(promo.image);
      await this.promoRepository.delete({ ordinalNumber: promo.ordinalNumber });
    }

    if (language !== ELandingUiLanguage.ENGLISH) {
      await this.promoRepository.remove(promo);
    }

    await this.invalidateCacheForLanguage(language);

    return;
  }

  public async updatePromoById(updatePromoDto: UpdatePromoDto): Promise<Promo> {
    const promo = await this.getOnePromoById(updatePromoDto.id);

    if (updatePromoDto.image) {
      const englishPromo = await this.getOnePromoByLanguageAndOrdinalNumber(
        ELandingUiLanguage.ENGLISH,
        updatePromoDto.ordinalNumber,
      );

      if (englishPromo?.image) {
        await this.deleteImageFromS3(englishPromo.image);
      }

      await this.promoRepository.update(
        { ordinalNumber: updatePromoDto.ordinalNumber },
        { image: updatePromoDto.image },
      );
    }

    await this.invalidateCacheForLanguage(promo.contentManagement.language);

    const updatedPromo = { ...promo, ...updatePromoDto };

    return this.promoRepository.save(updatedPromo);
  }

  private async updateContentManagementByPromoId(language: ELandingUiLanguage, promo: Promo): Promise<void> {
    const contentManagement = await this.contentManagementRepository.findOne({
      where: { language },
      relations: { promotions: true },
    });

    if (!contentManagement) {
      throw new NotFoundException("Content Management not found.");
    }

    const updatedContentManagement = this.contentManagementRepository.create({
      ...contentManagement,
      promotions: [...contentManagement.promotions, promo],
    });

    await this.contentManagementRepository.save(updatedContentManagement);
  }

  public async getContentManagementByLanguage(language: ELandingUiLanguage): Promise<ContentManagement> {
    const cacheKey = `content-management:${language}`;
    const cachedData = await this.redisService.getJson<ContentManagement>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const contentManagement = await this.contentManagementRepository.findOne({
      where: {
        language,
      },
      relations: { promotions: true },
      order: {
        promotions: { ordinalNumber: ESortOrder.ASC },
      },
    });

    if (!contentManagement) {
      throw new NotFoundException(`Content management with language ${language} not found`);
    }

    const reviews = await this.reviewsService.getAllReviews();
    const result = { ...contentManagement, reviews };

    await this.redisService.setJson(cacheKey, result, 0);

    return result;
  }

  public async updateContentManagementByLanguage(
    updateContentManagementDto: UpdateContentManagementDto,
  ): Promise<IMessageOutput> {
    const imageField = Object.keys(updateContentManagementDto).find((key) => key.includes("image"));

    const contentManagement = await this.contentManagementRepository.findOne({
      where: { language: updateContentManagementDto.language },
    });

    if (!contentManagement) {
      if (imageField) {
        const imageUrl = updateContentManagementDto[imageField as keyof UpdateContentManagementDto] as string;

        if (imageUrl) {
          await this.deleteImageFromS3(imageUrl);
        }
      }

      throw new NotFoundException(`Content management not found.`);
    }

    if (imageField) {
      const imageUrl = contentManagement[imageField as keyof ContentManagement] as string;

      if (imageUrl) {
        await this.deleteImageFromS3(imageUrl);
      }

      await this.updateContentManagementImages(updateContentManagementDto, imageField);
    }

    await this.contentManagementRepository.update(
      { language: updateContentManagementDto.language },
      updateContentManagementDto,
    );
    await this.invalidateCacheForAllLanguages();

    return { message: "The record has been updated successfully" };
  }

  private async updateContentManagementImages(
    updateContentManagementDto: UpdateContentManagementDto,
    imageField: string,
  ): Promise<void> {
    await this.contentManagementRepository.update(
      {},
      { [imageField]: updateContentManagementDto[imageField as keyof UpdateContentManagementDto] },
    );
  }

  private async deleteImageFromS3(imageUrl: string): Promise<void> {
    const key = this.awsS3Service.getKeyFromUrl(imageUrl);
    await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
  }

  private async invalidateCacheForLanguage(language: ELandingUiLanguage): Promise<void> {
    const cacheKey = `content-management:${language}`;
    await this.redisService.del(cacheKey);
  }

  private async invalidateCacheForAllLanguages(): Promise<void> {
    const cacheKey = `content-management:*`;
    await this.redisService.delManyByPattern(cacheKey);
  }

  public async saveImage(file: IFile): Promise<SaveImageOutput> {
    if (!file) {
      throw new NotFoundException("Image not found.");
    }

    const imageUrl = this.awsS3Service.getMediaObjectUrl(file.key);

    return { imageUrl };
  }
}
