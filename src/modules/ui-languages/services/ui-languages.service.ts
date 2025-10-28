import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EPossibleUiLanguage, EUiLanguagesErrorCodes } from "src/modules/ui-languages/common/enums";
import { UiLanguage } from "src/modules/ui-languages/entities";
import { Repository } from "typeorm";
import { IFile } from "src/modules/file-management/common/interfaces";
import { IS_MEDIA_BUCKET } from "src/common/constants";

@Injectable()
export class UiLanguagesService {
  constructor(
    @InjectRepository(UiLanguage)
    private readonly uiLanguagesRepository: Repository<UiLanguage>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  public async seedDatabaseFromSeedData(): Promise<void> {
    const existingLanguages = await this.uiLanguagesRepository.find();
    const existingLanguagesSet = new Set(existingLanguages.map((lang) => lang.language));

    const languagesToSeed = Object.values(EPossibleUiLanguage).filter(
      (language) => !existingLanguagesSet.has(language),
    );

    const seedData = languagesToSeed.map((language) =>
      this.uiLanguagesRepository.create({
        language: language,
        version: 0,
      }),
    );

    await this.uiLanguagesRepository.save(seedData);
  }

  public async find(): Promise<{ supportedLanguages: Record<EPossibleUiLanguage, { version: number }> }> {
    const uiLanguages = await this.uiLanguagesRepository.find();
    const supportedLanguages = uiLanguages.reduce(
      (accumulator, uiLanguage) => {
        accumulator[uiLanguage.language] = { version: uiLanguage.version };

        return accumulator;
      },
      {} as Record<EPossibleUiLanguage, { version: number }>,
    );

    return { supportedLanguages };
  }

  public async findOne(language: EPossibleUiLanguage): Promise<string> {
    const uiLanguage = await this.uiLanguagesRepository.findOneBy({ language });

    if (!uiLanguage || uiLanguage.version === 0 || !uiLanguage.file) {
      throw new NotFoundException(EUiLanguagesErrorCodes.LANGUAGE_FILE_NOT_FOUND);
    }

    return uiLanguage.file;
  }

  public async update(
    language: EPossibleUiLanguage,
    file: IFile,
  ): Promise<{
    message: string;
    language: EPossibleUiLanguage;
  }> {
    const uiLanguage = await this.uiLanguagesRepository.findOneBy({ language });

    if (!uiLanguage) {
      throw new NotFoundException(EUiLanguagesErrorCodes.LANGUAGE_FILE_NOT_FOUND);
    }

    if (uiLanguage.version !== 0 && uiLanguage.file) {
      const key = this.awsS3Service.getKeyFromUrl(uiLanguage.file);
      await this.awsS3Service.deleteObject(key, IS_MEDIA_BUCKET);
    }

    await this.uiLanguagesRepository.save({
      ...uiLanguage,
      version: uiLanguage.version + 1,
      file: this.awsS3Service.getMediaObjectUrl(file.key),
    });

    return { message: "Language file updated successfully", language };
  }
}
