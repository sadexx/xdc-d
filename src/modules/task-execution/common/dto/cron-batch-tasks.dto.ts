import { ArrayNotEmpty, IsArray, IsEnum } from "class-validator";
import { ECronTasks } from "src/modules/task-execution/common/enum";

export class BatchTasksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ECronTasks, { each: true })
  tasks: ECronTasks[];
}
