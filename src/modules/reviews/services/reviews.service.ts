import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ESortOrder } from "src/common/enums";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { CreateReviewDto, UpdateReviewDto } from "src/modules/reviews/common/dto";
import { Review } from "src/modules/reviews/entities";
import { Repository } from "typeorm";
import { RedisService } from "src/modules/redis/services";
import { ELandingUiLanguage } from "src/modules/content-management/common/enums";
import { IS_MEDIA_BUCKET } from "src/common/constants";

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly awsS3Service: AwsS3Service,
    private readonly redisService: RedisService,
  ) {}

  public async getOneReviewById(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException("Review not found.");
    }

    return review;
  }

  public async createReview(createReviewDto: CreateReviewDto): Promise<Review> {
    const reviewWithSameOrdinalNumber = await this.reviewRepository.findOne({
      where: { ordinalNumber: createReviewDto.ordinalNumber },
    });

    if (reviewWithSameOrdinalNumber) {
      throw new BadRequestException("The record with this ordinal number already exists.");
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      avatar: createReviewDto.avatar,
    });

    await this.invalidateCacheForAllLanguages();

    return await this.reviewRepository.save(review);
  }

  public async updateReviewById(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.getOneReviewById(id);

    if (updateReviewDto.ordinalNumber) {
      const reviewWithSameOrdinalNumber = await this.reviewRepository.findOne({
        where: { ordinalNumber: updateReviewDto.ordinalNumber },
      });

      if (reviewWithSameOrdinalNumber && reviewWithSameOrdinalNumber.id !== id) {
        throw new BadRequestException("The record with this ordinal number already exists.");
      }
    }

    if (updateReviewDto.avatar && review.avatar) {
      const key = this.awsS3Service.getKeyFromUrl(review.avatar);
      await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
    }

    await this.invalidateCacheForAllLanguages();

    const updatedReview = { ...review, ...updateReviewDto };

    return this.reviewRepository.save(updatedReview);
  }

  public async deleteReviewById(id: string): Promise<void> {
    const review = await this.getOneReviewById(id);

    if (review.avatar) {
      const key = this.awsS3Service.getKeyFromUrl(review.avatar);
      await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
    }

    await this.reviewRepository.remove(review);
    await this.invalidateCacheForAllLanguages();

    return;
  }

  public async getAllReviews(): Promise<Review[]> {
    return await this.reviewRepository.find({ order: { ordinalNumber: ESortOrder.ASC } });
  }

  private async invalidateCacheForAllLanguages(): Promise<void> {
    const supportedLanguages = Object.values(ELandingUiLanguage);
    for (const language of supportedLanguages) {
      const cacheKey = `content-management:${language}`;
      await this.redisService.del(cacheKey);
    }
  }
}
