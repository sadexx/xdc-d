import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { EGstPayer } from "src/modules/abn/common/enums/gst-pay.enum";

export class GetUserByAbnDto {
  @IsString()
  abn: string;

  @IsEnum(EGstPayer)
  isGstPayer: EGstPayer;

  @IsOptional()
  @IsUUID()
  userRoleId?: string;
}
