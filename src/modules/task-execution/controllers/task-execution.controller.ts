import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { IMessageOutput } from "src/common/outputs";
import { TaskDispatcherService } from "src/modules/task-execution/services";
import { BatchTasksDto } from "src/modules/task-execution/common/dto";
import { TaskAuthenticationGuard } from "src/modules/task-execution/common/guards";

@Controller("task-execution")
export class TaskExecutionController {
  constructor(private readonly systemTasksService: TaskDispatcherService) {}

  @Post("batch-execute")
  @UseGuards(TaskAuthenticationGuard)
  @HttpCode(HttpStatus.CREATED)
  async executeBatchTasks(@Body() batchTasksDto: BatchTasksDto): Promise<IMessageOutput> {
    void this.systemTasksService.executeTasksInBatch(batchTasksDto.tasks);

    return { message: "Batch tasks executed successfully" };
  }
}
