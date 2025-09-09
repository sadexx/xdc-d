import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomBytes } from "node:crypto";

@Injectable()
export class Base62EncoderService {
  private readonly ALPHABET: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  private readonly BASE: bigint = BigInt(this.ALPHABET.length);

  public generateRandom(length: number): string {
    if (!Number.isInteger(length) || length < 0) {
      throw new InternalServerErrorException("Length must be a non-negative integer.");
    }

    if (length === 0) {
      return "";
    }

    const bytes = randomBytes(length);
    let result = "";
    for (let i = 0; i < length; i++) {
      const index = BigInt(bytes[i]) % this.BASE;
      result += this.ALPHABET[Number(index)];
    }

    return result;
  }
}
