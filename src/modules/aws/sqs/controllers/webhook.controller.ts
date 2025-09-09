import { Controller, Get } from "@nestjs/common";
import { WebhookService } from "src/modules/aws/sqs/services";

@Controller("webhook")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get("manual-status-checks")
  async getManualStatusCheckSumsub(): Promise<{
    message: string;
  }> {
    void this.webhookService.getManualStatusCheckWebhook();

    return { message: "Launch: Manual status checks" };
  }
}
