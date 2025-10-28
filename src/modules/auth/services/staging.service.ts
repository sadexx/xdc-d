import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ENVIRONMENT } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { EAuthErrorCodes } from "src/modules/auth/common/enums";

@Injectable()
export class StagingService {
  private readonly IS_STAGING: boolean;
  private readonly ALLOWED_EMAILS: string[];

  constructor(private readonly configService: ConfigService) {
    this.IS_STAGING = ENVIRONMENT === EEnvironment.STAGING;
    this.ALLOWED_EMAILS = this.configService.getOrThrow<string[]>("staging.allowedEmails", []);
  }

  public async checkEmailAccess(email: string): Promise<void> {
    if (!this.IS_STAGING) {
      return;
    }

    if (!this.ALLOWED_EMAILS.includes(email)) {
      throw new ForbiddenException(EAuthErrorCodes.STAGING_EMAIL_NOT_AUTHORIZED);
    }
  }
}
