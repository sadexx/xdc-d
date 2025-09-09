import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ELandingSection, ELandingUiLanguage } from "src/modules/content-management/common/enums";

export class UpdateContentManagementDto {
  @IsEnum(ELandingUiLanguage)
  language: ELandingUiLanguage;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleLfhWorkSmartphone?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionLfhWorkSmartphone?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionLfhWorkSmartphone?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageLfhWorkSmartphone?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionLfhWorkSmartphone?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleLfhWorkLaptop?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionLfhWorkLaptop?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionLfhWorkLaptop?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageLfhWorkLaptop?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionLfhWorkLaptop?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleLanguageSpecialistsFirst?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionLanguageSpecialistsFirst?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionLanguageSpecialistsFirst?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageLanguageSpecialistsFirst?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionLanguageSpecialistsFirst?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleLanguageSpecialistsSecond?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionLanguageSpecialistsSecond?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionLanguageSpecialistsSecond?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageLanguageSpecialistsSecond?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionLanguageSpecialistsSecond?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysTopLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysTopLeft?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysTopLeft?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysTopLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysTopLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysMiddleLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysMiddleLeft?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysMiddleLeft?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysMiddleLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysMiddleLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysMiddle?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysMiddle?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysMiddleRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysMiddleRight?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysMiddleRight?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysMiddleRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysMiddleRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysLeftBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysLeftBottom?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysLeftBottom?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysLeftBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysLeftBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysMiddleBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysMiddleBottom?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysMiddleBottom?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysMiddleBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysMiddleBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleKeysRightBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionKeysRightBottom?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionKeysRightBottom?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageKeysRightBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionKeysRightBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleWorkWithUsFirst?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionWorkWithUsFirst?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionWorkWithUsFirst?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageWorkWithUsFirst?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionWorkWithUsFirst?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleWorkWithUsSecond?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionWorkWithUsSecond?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionWorkWithUsSecond?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageWorkWithUsSecond?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionWorkWithUsSecond?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleWorkWithUsThird?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionWorkWithUsThird?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionWorkWithUsThird?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageWorkWithUsThird?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionWorkWithUsThird?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleWorkWithUsFourth?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionWorkWithUsFourth?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionWorkWithUsFourth?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageWorkWithUsFourth?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionWorkWithUsFourth?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesTopLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesTopLeft?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesTopLeft?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesTopLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesTopLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesTopMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesTopMiddle?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesTopMiddle?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesTopMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesTopMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesTopRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesTopRight?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesTopRight?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesTopRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesTopRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesMiddleLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesMiddleLeft?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesMiddleLeft?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesMiddleLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesMiddleLeft?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesMiddle?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesMiddle?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesMiddle?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesMiddleRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesMiddleRight?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesMiddleRight?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesMiddleRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesMiddleRight?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesLeftBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesLeftBottom?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesLeftBottom?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesLeftBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesLeftBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesMiddleBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesMiddleBottom?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesMiddleBottom?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesMiddleBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesMiddleBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  titleCompanyValuesRightBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  descriptionCompanyValuesRightBottom?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionCompanyValuesRightBottom?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  imageCompanyValuesRightBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionCompanyValuesRightBottom?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  linkSocialMediaLinkedin?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionSocialMediaLinkedin?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionSocialMediaLinkedin?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  linkSocialMediaFacebook?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionSocialMediaFacebook?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionSocialMediaFacebook?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  linkSocialMediaInstagram?: string;

  @IsOptional()
  @IsEnum(ELandingSection)
  landingSectionSocialMediaInstagram?: ELandingSection;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  positionSocialMediaInstagram?: string;
}
