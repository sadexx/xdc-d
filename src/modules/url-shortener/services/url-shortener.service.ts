import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Base62EncoderService } from "src/modules/url-shortener/services";
import { ShortUrl } from "src/modules/url-shortener/entities";
import { subMinutes } from "date-fns";
import { findOneTyped } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { TAppointmentForInvitation } from "src/modules/appointments/shared/common/types";
import { ResolveShortUrlQuery, TResolveShortUrl } from "src/modules/url-shortener/common/types";
import { EUrlShortenerErrorCodes } from "src/modules/url-shortener/common/enums";

@Injectable()
export class UrlShortenerService {
  private readonly lokiLogger = new LokiLogger(UrlShortenerService.name);
  private readonly CODE_LENGTH: number = 6;
  private readonly MAX_GENERATION_ATTEMPTS: number = 20;
  private readonly URL_PATH: string = "v1/lnk";
  private readonly BACK_END_URL: string;
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(ShortUrl)
    private readonly shortUrlRepository: Repository<ShortUrl>,
    private readonly base62EncoderService: Base62EncoderService,
    private readonly configService: ConfigService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async resolveShortUrl(shortCode: string): Promise<string> {
    const shortUrl = await findOneTyped<TResolveShortUrl>(this.shortUrlRepository, {
      select: ResolveShortUrlQuery.select,
      where: { shortCode },
    });

    if (!shortUrl) {
      return `${this.FRONT_END_URL}/not-found`;
    }

    if (new Date() < shortUrl.activeFrom) {
      throw new BadRequestException(EUrlShortenerErrorCodes.URL_NOT_ACTIVE_YET);
    }

    return shortUrl.destinationUrl;
  }

  public async createAppointmentShortUrl(
    meetingUrl: string,
    appointment: TAppointmentForInvitation,
  ): Promise<string | null> {
    const MEETING_ACTIVATION_OFFSET_MINUTES = 3;

    const shortCode = await this.generateUniqueCode();

    if (!shortCode) {
      this.lokiLogger.warn(`Could not generate unique code for short url for appointment: ${appointment.platformId}`);

      return null;
    }

    const activeFrom = subMinutes(appointment.scheduledStartTime, MEETING_ACTIVATION_OFFSET_MINUTES);

    const savedShortUrlEntity = await this.constructAndCreateShortUrl({
      shortCode,
      activeFrom,
      appointment,
      destinationUrl: meetingUrl,
    });

    return this.buildShortUrl(savedShortUrlEntity.shortCode);
  }

  private async generateUniqueCode(): Promise<string | null> {
    for (let attempts = 0; attempts < this.MAX_GENERATION_ATTEMPTS; attempts++) {
      const shortCode = this.base62EncoderService.generateRandom(this.CODE_LENGTH);
      const exists = await this.shortUrlRepository.exists({ where: { shortCode } });

      if (!exists) {
        return shortCode;
      }
    }

    return null;
  }

  private async constructAndCreateShortUrl(data: {
    shortCode: string;
    destinationUrl: string;
    activeFrom: Date;
    appointment: TAppointmentForInvitation;
  }): Promise<ShortUrl> {
    const newShortUrl = this.shortUrlRepository.create(data);
    const savedShortUrl = this.shortUrlRepository.save(newShortUrl);

    return savedShortUrl;
  }

  private buildShortUrl(shortCode: string): string {
    return `${this.BACK_END_URL}/${this.URL_PATH}/${shortCode}`;
  }
}
