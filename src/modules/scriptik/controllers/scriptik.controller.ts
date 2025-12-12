import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ScriptikService } from "src/modules/scriptik/services";
import { LokiLogger } from "src/common/logger";

@Controller("scriptik")
export class ScriptickController {
  private readonly lokiLogger = new LokiLogger(ScriptickController.name);
  constructor(private readonly scriptikService: ScriptikService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("run")
  async runScriptik(): Promise<void> {
    this.scriptikService.runScriptik().catch((error: Error) => {
      this.lokiLogger.error(`Failed to run scriptik`, error.stack);
    });
  }
}
