import { Module } from "@nestjs/common";
import { HttpRequestService } from "src/modules/http-client/services";

@Module({
  imports: [],
  providers: [HttpRequestService],
  exports: [HttpRequestService],
})
export class HttpClientModule {}
