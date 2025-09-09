import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtRestorationService extends JwtService {
  constructor() {
    super({
      secret: process.env.JWT_RESTORE_TOKEN_SECRET,
      signOptions: {
        expiresIn: `${process.env.JWT_RESTORE_TOKEN_EXPIRATION_TIME}s`,
      },
    });
  }
}
