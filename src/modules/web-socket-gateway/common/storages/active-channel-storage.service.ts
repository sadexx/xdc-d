import { Injectable } from "@nestjs/common";
import { NUMBER_OF_MINUTES_IN_FIVE_MINUTES, NUMBER_OF_SECONDS_IN_MINUTE } from "src/common/constants";
import { RedisService } from "src/modules/redis/services";

@Injectable()
export class ActiveChannelStorageService {
  constructor(private readonly redisService: RedisService) {}

  public async getActiveChannel(userRoleId: string): Promise<string | null> {
    const key = this.getKey(userRoleId);

    return this.redisService.get(key);
  }

  public async setActiveChannel(userRoleId: string, channelArn: string): Promise<void> {
    const key = this.getKey(userRoleId);

    await this.redisService.set(key, channelArn, NUMBER_OF_MINUTES_IN_FIVE_MINUTES * NUMBER_OF_SECONDS_IN_MINUTE);
  }

  public async removeActiveChannel(userRoleId: string): Promise<void> {
    const key = this.getKey(userRoleId);
    await this.redisService.del(key);
  }

  private getKey(userRoleId: string): string {
    return `activeChannels:${userRoleId}`;
  }
}
