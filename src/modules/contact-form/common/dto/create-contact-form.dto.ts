import { IsEmail, IsLowercase, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateContactFormDto {
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z- ]+$/, {
    message: "Name must contain only letters and hyphen.",
  })
  userName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^[A-Za-z0-9 ,.\-():]+$/, {
    message: "Message must contain only letters, numbers, spaces, commas, dots, and dashes.",
  })
  message?: string;
}
