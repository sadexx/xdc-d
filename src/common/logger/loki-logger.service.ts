import { ConsoleLogger, ConsoleLoggerOptions, Injectable, LogLevel } from "@nestjs/common";
import {
  LOKI_URL,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
  SEND_LOG_TO_LOKI,
  UNDEFINED_VALUE,
} from "src/common/constants";

@Injectable()
export class LokiLogger extends ConsoleLogger {
  private readonly NANOSECONDS: number = 1e6;
  private readonly LOKI_ERROR: string = "Failed to send log to Loki";
  private readonly lokiUrl = LOKI_URL;
  private readonly isLokiEnabled: boolean;

  constructor(context: string, options?: ConsoleLoggerOptions) {
    super(context, options ?? { logLevels: ["log", "error", "warn", "debug", "verbose", "fatal"], timestamp: false });

    if (SEND_LOG_TO_LOKI) {
      this.isLokiEnabled = true;
    } else {
      this.isLokiEnabled = false;
    }
  }

  private async sendToLoki(level: string, message: string, context: string, stack?: string): Promise<void> {
    if (!this.isLokiEnabled) {
      return;
    }

    const logEntry = {
      streams: [
        {
          stream: { job: "fleet", service_name: context, level: level, context: context },
          values: [[`${Date.now() * this.NANOSECONDS}`, `${level.toUpperCase()}: ${message} ${stack || ""}`]],
        },
      ],
    };

    await fetch(this.lokiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logEntry),
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    }).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override setLogLevels(levels: LogLevel[]): void {
    super.setLogLevels(levels);
  }

  public override setContext(context: string): void {
    super.setContext(context);
  }

  public override resetContext(): void {
    super.resetContext();
  }

  public override isLevelEnabled(level: LogLevel): boolean {
    return super.isLevelEnabled(level);
  }

  private getContext(): string {
    return this.context || this.constructor.name;
  }

  public logHttpWithoutPrint(message: string): void {
    const context = this.getContext();
    this.sendToLoki("http", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public logWithoutPrint(message: string): void {
    const context = this.getContext();
    this.sendToLoki("info", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public errorWithoutPrint(message: string, stackTrace?: string): void {
    const context = this.getContext();
    this.sendToLoki("error", message, context, stackTrace).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override log(message: string): void {
    super.log(message);
    const context = this.getContext();
    this.sendToLoki("info", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override error(message: string, stackTrace?: string): void {
    const context = this.getContext();

    if (!stackTrace) {
      super.error(message, UNDEFINED_VALUE, context);
    } else {
      super.error(message, stackTrace, context);
    }

    this.sendToLoki("error", message, context, stackTrace).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override warn(message: string): void {
    super.warn(message);
    const context = this.getContext();
    this.sendToLoki("warn", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override debug(message: string): void {
    super.debug(message);
    const context = this.getContext();
    this.sendToLoki("debug", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override verbose(message: string): void {
    super.verbose(message);
    const context = this.getContext();
    this.sendToLoki("verbose", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }

  public override fatal(message: string): void {
    super.fatal?.(message);
    const context = this.getContext();
    this.sendToLoki("fatal", message, context).catch((error: Error) => {
      super.error(this.LOKI_ERROR, error.message);
    });
  }
}
