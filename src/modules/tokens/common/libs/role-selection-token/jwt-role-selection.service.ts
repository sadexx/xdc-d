import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtRoleSelectionService extends JwtService {
  constructor() {
    super({
      secret: process.env.JWT_ROLE_SELECTION_TOKEN_SECRET,
      signOptions: {
        expiresIn: `${process.env.JWT_ROLE_SELECTION_TOKEN_EXPIRATION_TIME}s`,
      },
    });
  }
}
