import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";
import { RedisService } from "src/modules/redis/services";
import {
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_THREE_HOURS,
} from "src/common/constants";

@Injectable()
export class PdfBase64ImageConverterService {
  private readonly lokiLogger = new LokiLogger(PdfBase64ImageConverterService.name);

  constructor(private readonly redisService: RedisService) {}

  public async convertImageToBase64(imageUrl: string, userRoleId: string): Promise<string> {
    const cacheKey = `base64avatar:${userRoleId}`;
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch image from ${imageUrl}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type");
      const base64Image = `data:${mimeType};base64,${base64}`;

      await this.redisService.set(cacheKey, base64Image, NUMBER_OF_MINUTES_IN_THREE_HOURS * NUMBER_OF_MINUTES_IN_HOUR);

      return base64Image;
    } catch (error) {
      this.lokiLogger.error(`Error converting image to Base64: ${(error as Error).message}, ${(error as Error).stack}`);
      throw new InternalServerErrorException("An unexpected error occurred while converting the image.");
    }
  }
}
