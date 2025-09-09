import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtEmailConfirmationService extends JwtService {
  constructor() {
    super({
      secret: process.env.JWT_EMAIL_CONFIRMATION_TOKEN_SECRET,
      signOptions: {
        expiresIn: `${process.env.JWT_EMAIL_CONFIRMATION_TOKEN_EXPIRATION_TIME}s`,
      },
    });
  }
}
