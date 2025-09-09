import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ArchiveAudioRecordService } from "src/modules/archive-audio-records/services";
import { IMessageOutput } from "src/common/outputs";

@Controller("archive-audio-records")
export class ArchiveAudioRecordsController {
  constructor(private readonly archiveAudioRecordService: ArchiveAudioRecordService) {}

  @Get("/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAudioRecording(@Param() { id }: UUIDParamDto): Promise<IMessageOutput | string> {
    return await this.archiveAudioRecordService.getAudioRecordingForAppointment(id);
  }
}
