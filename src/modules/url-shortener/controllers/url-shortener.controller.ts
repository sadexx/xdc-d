import { Controller, Get, HttpStatus, Param, Redirect } from "@nestjs/common";
import { UrlShortenerService } from "src/modules/url-shortener/services";
import { ShortUrlParamDto } from "src/modules/url-shortener/common/dto";
import { IRedirectUrlOutput } from "src/common/outputs";

@Controller("lnk")
export class UrlShortenerController {
  constructor(private readonly urlShortenerService: UrlShortenerService) {}

  @Get(":shortCode")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async redirectShortUrl(@Param() { shortCode }: ShortUrlParamDto): Promise<IRedirectUrlOutput> {
    const destination = await this.urlShortenerService.resolveShortUrl(shortCode);

    return { url: destination };
  }
}
