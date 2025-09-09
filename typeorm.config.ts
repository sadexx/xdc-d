import "dotenv/config";
import { ENVIRONMENT, NUMBER_OF_MILLISECONDS_IN_MINUTE } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { loadEnv } from "src/config";
import * as fs from "fs";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";

const envVariables = loadEnv();
const isProduction = ENVIRONMENT === EEnvironment.PRODUCTION;
const typeOrmModuleOptions: TypeOrmModuleOptions = {
  retryAttempts: 5,
  retryDelay: 5000,
  verboseRetryLog: true,
};

export const dataSourceOptions: DataSourceOptions = {
  host: envVariables.db.host,
  port: envVariables.db.port,
  database: envVariables.db.database,
  username: envVariables.db.username,
  password: envVariables.db.password,
  type: "postgres",
  schema: "public",
  useUTC: false,
  connectTimeoutMS: 0,
  poolSize: 20,
  uuidExtension: "uuid-ossp",
  entities: [__dirname + "/src/**/{*.entity,enums}.{js,ts}"],
  migrations: [__dirname + "/src/database/migrations/*.{js,ts}"],
  logging: false,
  logger: "simple-console",
  synchronize: false,
  migrationsRun: false,
  relationLoadStrategy: "join",
  ssl: isProduction
    ? {
        rejectUnauthorized: true,
        ca: [fs.readFileSync(__dirname + "/../global-bundle.pem").toString()],
      }
    : false,
  cache: {
    type: "ioredis",
    duration: envVariables.redis.ttlMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    options: {
      host: envVariables.redis.host,
      port: envVariables.redis.port,
    },
  },
};

export const typeOrmConfig = {
  ...typeOrmModuleOptions,
  ...dataSourceOptions,
};
