import { LokiLogger } from "src/common/logger/loki-logger.service";
export const SingleLokiLogger = new LokiLogger("NestApplication", { timestamp: false });
