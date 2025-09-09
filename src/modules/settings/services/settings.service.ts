import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Setting } from "src/modules/settings/entities";
import { Repository } from "typeorm";
import { UpdateSettingDto } from "src/modules/settings/common/dto";
import { RedisService } from "src/modules/redis/services";
import { LokiLogger } from "src/common/logger";
import { NUMBER_OF_MINUTES_IN_DAY, NUMBER_OF_SECONDS_IN_MINUTE } from "src/common/constants";
import { instanceToPlain } from "class-transformer";
import { IMessageOutput } from "src/common/outputs";

@Injectable()
export class SettingsService {
  private readonly lokiLogger = new LokiLogger(SettingsService.name);
  private readonly CACHE_KEY: string = "global-settings";

  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
    private readonly redisService: RedisService,
  ) {}

  public async seedSettingsToDatabase(): Promise<void> {
    const ratesCount = await this.settingsRepository.count();

    if (ratesCount === 0) {
      const seedData: Partial<Setting> = {
        cancelOnDemandGracePeriodSeconds: 60,
      };

      const setting = this.settingsRepository.create(seedData);

      await this.settingsRepository.save(setting);
      this.lokiLogger.log(`Seeded Settings table, added record`);
    }
  }

  public async getSettings(): Promise<Omit<Setting, "id">> {
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_DAY * NUMBER_OF_SECONDS_IN_MINUTE;
    const cacheData = await this.redisService.getJson<Omit<Setting, "id">>(this.CACHE_KEY);

    if (cacheData) {
      return cacheData;
    }

    const [settings] = await this.settingsRepository.find();

    const transformSetting = instanceToPlain<Setting>(settings);
    await this.redisService.setJson(this.CACHE_KEY, transformSetting, CACHE_TTL);

    return settings;
  }

  public async updateSetting(dto: UpdateSettingDto): Promise<IMessageOutput> {
    await this.settingsRepository.updateAll(dto);
    await this.redisService.del(this.CACHE_KEY);

    return { message: "Settings updated successfully." };
  }
}
