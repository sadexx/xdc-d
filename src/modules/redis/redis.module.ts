import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/modules/redis/services";
import { IRedisConnectionData } from "src/modules/redis/common/interfaces";
import { REDIS_CLIENT, REDIS_MAX_RETRIES } from "src/modules/redis/common/constants";
import { NUMBER_OF_MILLISECONDS_IN_FIVE_SECONDS } from "src/common/constants";
import Redis from "ioredis";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService): Promise<Redis> => {
        const redisConfig = configService.getOrThrow<IRedisConnectionData>("redis");

        return new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          maxRetriesPerRequest: null,
          retryStrategy: (times: number): number | null => {
            if (times <= REDIS_MAX_RETRIES) {
              return NUMBER_OF_MILLISECONDS_IN_FIVE_SECONDS;
            }

            return null;
          },
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
