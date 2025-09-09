import { INestApplication } from "@nestjs/common";
import { NUMBER_OF_MILLISECONDS_IN_FIVE_SECONDS } from "src/common/constants";
import { SingleLokiLogger } from "src/common/logger";

let isShuttingDown = false;

export function setupGracefulShutdown(app: INestApplication): void {
  async function gracefulShutdown(reason: string, error?: Error): Promise<void> {
    if (isShuttingDown) {
      SingleLokiLogger.warn(`Error during shutdown: ${error?.message}`);
      SingleLokiLogger.warn(`Stack during shutdown: ${error?.stack}`);

      return;
    }

    isShuttingDown = true;

    SingleLokiLogger.warn(`Initiating graceful shutdown due to: ${reason}.`);

    if (error) {
      if (error instanceof Error) {
        SingleLokiLogger.error(`Error: ${error.message}`);
        SingleLokiLogger.error(`Stack: ${error.stack}`);
      } else {
        SingleLokiLogger.error(`Unknown Error: ${JSON.stringify(error)}`);
      }
    }

    await app.close();
    SingleLokiLogger.warn("No longer accepting new requests, waiting for in-flight requests to finish...");
    setTimeout(() => {
      SingleLokiLogger.warn("Forcefully terminating after grace period...");
      process.exit(1);
    }, NUMBER_OF_MILLISECONDS_IN_FIVE_SECONDS).unref();
  }

  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM signal received"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT signal received"));

  process.on("uncaughtException", (err: Error, origin: string) => {
    SingleLokiLogger.error(`Uncaught Exception at origin: ${origin}`);
    void gracefulShutdown("Uncaught Exception", err);
  });

  process.on("unhandledRejection", (reason: Error, promise: Promise<unknown>) => {
    SingleLokiLogger.error(`Unhandled Rejection at: ${JSON.stringify(promise)}`);
    void gracefulShutdown("Unhandled Rejection", reason);
  });
}
