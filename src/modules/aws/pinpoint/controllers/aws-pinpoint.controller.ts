import { Controller, Get } from "@nestjs/common";
import countryCodes from "src/modules/aws/pinpoint/common/utils/country-codes";
import { AwsPinpointService } from "src/modules/aws/pinpoint/services";

@Controller()
export class AwsPinpointController {
  constructor(protected readonly awsPinpointService: AwsPinpointService) {}

  @Get("phone-codes")
  async getPhoneCodes(): Promise<{
    "+380": string;
    "+61": string;
    "+359": string;
    "+48": string;
  }> {
    return countryCodes;
  }
}
