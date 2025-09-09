import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CreateReviewDto, UpdateReviewDto } from "src/modules/reviews/common/dto";
import { Review } from "src/modules/reviews/entities";
import { ReviewsService } from "src/modules/reviews/services";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getOneReviewById(@Param() { id }: UUIDParamDto): Promise<Review> {
    return this.reviewsService.getOneReviewById(id);
  }

  @Post()
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createReview(@Body() dto: CreateReviewDto): Promise<Review> {
    return this.reviewsService.createReview(dto);
  }

  @Patch(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateReviewById(@Param() { id }: UUIDParamDto, @Body() dto: UpdateReviewDto): Promise<Review> {
    return this.reviewsService.updateReviewById(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReviewByIdAndLanguage(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.reviewsService.deleteReviewById(id);
  }
}
