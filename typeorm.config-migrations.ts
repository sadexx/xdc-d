import { DataSource, DataSourceOptions } from "typeorm";
import "dotenv/config";
import { dataSourceOptions } from "typeorm.config";
import { loadEnv } from "src/config";

const envVariables = loadEnv();

export const typeOrmMigrationsConfig = new DataSource({
  ...dataSourceOptions,
  port: envVariables.db.port,
  host: "localhost",
} as DataSourceOptions);
