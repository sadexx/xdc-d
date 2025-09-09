import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ShortUrl } from "src/modules/url-shortener/entities";
import { Base62EncoderService, UrlShortenerService } from "src/modules/url-shortener/services";
import { UrlShortenerController } from "src/modules/url-shortener/controllers";

@Module({
  imports: [TypeOrmModule.forFeature([ShortUrl])],
  controllers: [UrlShortenerController],
  providers: [UrlShortenerService, Base62EncoderService],
  exports: [UrlShortenerService],
})
export class UrlShortenerModule {}
