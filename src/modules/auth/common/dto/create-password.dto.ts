import { IsString, Matches, MinLength } from "class-validator";

export class CreatePasswordDto {
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z]).{8,}$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter.",
  })
  password: string;
}
