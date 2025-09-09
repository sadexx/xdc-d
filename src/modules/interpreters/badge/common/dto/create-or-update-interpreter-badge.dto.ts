import { IsBase64, IsNotEmpty } from "class-validator";

export class CreateOrUpdateInterpreterBadge {
  @IsNotEmpty()
  @IsBase64()
  interpreterBadge: string;
}
