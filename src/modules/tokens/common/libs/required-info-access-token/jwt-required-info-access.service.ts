import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtRequiredInfoAccessService extends JwtService {
  constructor() {
    super({
      secret: process.env.JWT_REQUIRED_INFO_ACCESS_TOKEN_SECRET,
      signOptions: {
        expiresIn: `${process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME}s`,
      },
    });
  }
}
