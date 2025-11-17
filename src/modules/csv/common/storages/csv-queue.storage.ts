import { BadRequestException, Injectable } from "@nestjs/common";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { RedisService } from "src/modules/redis/services";
import { ECsvErrorCodes } from "src/modules/csv/common/enums";

@Injectable()
export class CsvQueueStorageService {
  private readonly MAX_CONCURRENCY = 1;
  constructor(private readonly redisService: RedisService) {}

  public async acquireSlot(user?: ITokenUserData): Promise<void> {
    const key = this.getKey(user);
    const newCount = await this.redisService.incr(key);

    if (newCount > this.MAX_CONCURRENCY) {
      await this.redisService.decr(key);
      throw new BadRequestException(ECsvErrorCodes.CSV_DOWNLOAD_LIMIT_EXCEEDED);
    }
  }

  public async releaseSlot(user?: ITokenUserData): Promise<void> {
    const key = this.getKey(user);
    const newCount = await this.redisService.decr(key);

    if (newCount <= 0) {
      await this.redisService.del(key);
    }
  }

  private getKey(user?: ITokenUserData): string {
    if (user) {
      return `csv-concurrency:${user.clientIPAddress}:${user.clientUserAgent}`;
    }

    return `csv-concurrency:global`;
  }
}
