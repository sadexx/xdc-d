import { IsNotEmpty, IsISO8601 } from "class-validator";

export class GetStatisticsByDatesDto {
  @IsNotEmpty()
  @IsISO8601()
  dateFrom: Date;

  @IsNotEmpty()
  @IsISO8601()
  dateTo: Date;
}
