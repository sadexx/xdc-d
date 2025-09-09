import { IsString, Length, Matches } from "class-validator";

export class ShortUrlParamDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9A-Za-z]{6}$/, {
    message: "shortCode must consist of 6 Base62 characters (0-9, A-Z, a-z)",
  })
  shortCode: string;
}
