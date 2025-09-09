import { ELandingSection, ELandingUiLanguage } from "src/modules/content-management/common/enums";
import { Promo } from "src/modules/content-management/entities";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "content_managements" })
export class ContentManagement {
  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "content_managements_PK" })
  id: string;

  @OneToMany(() => Promo, (promo) => promo.contentManagement)
  promotions: Promo[];

  @Column({ type: "enum", name: "language", enum: ELandingUiLanguage })
  language: ELandingUiLanguage;

  @Column({ type: "varchar", name: "title_lfh_work_smartphone", nullable: true })
  titleLfhWorkSmartphone: string | null;

  @Column({ type: "varchar", name: "description_lfh_work_smartphone", nullable: true })
  descriptionLfhWorkSmartphone: string | null;

  @Column({
    type: "enum",
    name: "landing_section_lfh_work_smartphone",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionLfhWorkSmartphone: ELandingSection | null;

  @Column({ type: "varchar", name: "image_lfh_work_smartphone", nullable: true })
  imageLfhWorkSmartphone: string | null;

  @Column({ type: "varchar", name: "position_lfh_work_smartphone", nullable: true })
  positionLfhWorkSmartphone: string | null;

  @Column({ type: "varchar", name: "title_lfh_work_laptop", nullable: true })
  titleLfhWorkLaptop: string | null;

  @Column({ type: "varchar", name: "description_lfh_work_laptop", nullable: true })
  descriptionLfhWorkLaptop: string | null;

  @Column({
    type: "enum",
    name: "landing_section_lfh_work_laptop",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionLfhWorkLaptop: ELandingSection | null;

  @Column({ type: "varchar", name: "image_lfh_work_laptop", nullable: true })
  imageLfhWorkLaptop: string | null;

  @Column({ type: "varchar", name: "position_lfh_work_laptop", nullable: true })
  positionLfhWorkLaptop: string | null;

  @Column({ type: "varchar", name: "title_language_specialists_first", nullable: true })
  titleLanguageSpecialistsFirst: string | null;

  @Column({ type: "varchar", name: "description_language_specialists_first", nullable: true })
  descriptionLanguageSpecialistsFirst: string | null;

  @Column({
    type: "enum",
    name: "landing_language_specialists_first",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionLanguageSpecialistsFirst: ELandingSection | null;

  @Column({ type: "varchar", name: "image_language_specialists_first", nullable: true })
  imageLanguageSpecialistsFirst: string | null;

  @Column({ type: "varchar", name: "position_language_specialists_first", nullable: true })
  positionLanguageSpecialistsFirst: string | null;

  @Column({ type: "varchar", name: "title_language_specialists_second", nullable: true })
  titleLanguageSpecialistsSecond: string | null;

  @Column({ type: "varchar", name: "description_language_specialists_second", nullable: true })
  descriptionLanguageSpecialistsSecond: string | null;

  @Column({
    type: "enum",
    name: "landing_language_specialists_second",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionLanguageSpecialistsSecond: ELandingSection | null;

  @Column({ type: "varchar", name: "image_language_specialists_second", nullable: true })
  imageLanguageSpecialistsSecond: string | null;

  @Column({ type: "varchar", name: "position_language_specialists_second", nullable: true })
  positionLanguageSpecialistsSecond: string | null;

  @Column({ type: "varchar", name: "title_keys_top_left", nullable: true })
  titleKeysTopLeft: string | null;

  @Column({ type: "varchar", name: "description_keys_top_left", nullable: true })
  descriptionKeysTopLeft: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_top_left",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysTopLeft: ELandingSection | null;

  @Column({ type: "varchar", name: "image_keys_top_left", nullable: true })
  imageKeysTopLeft: string | null;

  @Column({ type: "varchar", name: "position_keys_top_left", nullable: true })
  positionKeysTopLeft: string | null;

  @Column({ type: "varchar", name: "title_keys_middle_left", nullable: true })
  titleKeysMiddleLeft: string | null;

  @Column({ type: "varchar", name: "description_keys_middle_left", nullable: true })
  descriptionKeysMiddleLeft: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_middle_left",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysMiddleLeft: ELandingSection | null;

  @Column({ type: "varchar", name: "image_keys_middle_left", nullable: true })
  imageKeysMiddleLeft: string | null;

  @Column({ type: "varchar", name: "position_keys_middle_left", nullable: true })
  positionKeysMiddleLeft: string | null;

  @Column({ type: "varchar", name: "title_keys_middle", nullable: true })
  titleKeysMiddle: string | null;

  @Column({ type: "varchar", name: "description_keys_middle", nullable: true })
  descriptionKeysMiddle: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_middle",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysMiddle: ELandingSection | null;

  @Column({ type: "varchar", name: "image_keys_middle", nullable: true })
  imageKeysMiddle: string | null;

  @Column({ type: "varchar", name: "position_keys_middle", nullable: true })
  positionKeysMiddle: string | null;

  @Column({ type: "varchar", name: "title_keys_middle_right", nullable: true })
  titleKeysMiddleRight: string | null;

  @Column({ type: "varchar", name: "description_keys_middle_right", nullable: true })
  descriptionKeysMiddleRight: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_middle_right",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysMiddleRight: ELandingSection | null;

  @Column({ type: "varchar", name: "image_language_keys_middle_right", nullable: true })
  imageKeysMiddleRight: string | null;

  @Column({ type: "varchar", name: "position_keys_middle_right", nullable: true })
  positionKeysMiddleRight: string | null;

  @Column({ type: "varchar", name: "title_keys_left_bottom", nullable: true })
  titleKeysLeftBottom: string | null;

  @Column({ type: "varchar", name: "description_keys_left_bottom", nullable: true })
  descriptionKeysLeftBottom: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_left_bottom",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysLeftBottom: ELandingSection | null;

  @Column({ type: "varchar", name: "image_language_keys_left_bottom", nullable: true })
  imageKeysLeftBottom: string | null;

  @Column({ type: "varchar", name: "position_keys_left_bottom", nullable: true })
  positionKeysLeftBottom: string | null;

  @Column({ type: "varchar", name: "title_keys_middle_bottom", nullable: true })
  titleKeysMiddleBottom: string | null;

  @Column({ type: "varchar", name: "description_keys_middle_bottom", nullable: true })
  descriptionKeysMiddleBottom: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_middle_bottom",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysMiddleBottom: ELandingSection | null;

  @Column({ type: "varchar", name: "image_keys_middle_bottom", nullable: true })
  imageKeysMiddleBottom: string | null;

  @Column({ type: "varchar", name: "position_keys_middle_bottom", nullable: true })
  positionKeysMiddleBottom: string | null;

  @Column({ type: "varchar", name: "title_keys_right_bottom", nullable: true })
  titleKeysRightBottom: string | null;

  @Column({ type: "varchar", name: "description_keys_right_bottom", nullable: true })
  descriptionKeysRightBottom: string | null;

  @Column({
    type: "enum",
    name: "landing_keys_right_bottom",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionKeysRightBottom: ELandingSection | null;

  @Column({ type: "varchar", name: "image_keys_right_bottom", nullable: true })
  imageKeysRightBottom: string | null;

  @Column({ type: "varchar", name: "position_keys_right_bottom", nullable: true })
  positionKeysRightBottom: string | null;

  @Column({ type: "varchar", name: "title_work_with_us_first", nullable: true })
  titleWorkWithUsFirst: string | null;

  @Column({ type: "varchar", name: "description_work_with_us_first", nullable: true })
  descriptionWorkWithUsFirst: string | null;

  @Column({
    type: "enum",
    name: "landing_work_with_us_first",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionWorkWithUsFirst: ELandingSection | null;

  @Column({ type: "varchar", name: "image_work_with_us_first", nullable: true })
  imageWorkWithUsFirst: string | null;

  @Column({ type: "varchar", name: "position_work_with_us_first", nullable: true })
  positionWorkWithUsFirst: string | null;

  @Column({ type: "varchar", name: "title_work_with_us_second", nullable: true })
  titleWorkWithUsSecond: string | null;

  @Column({ type: "varchar", name: "description_work_with_us_second", nullable: true })
  descriptionWorkWithUsSecond: string | null;

  @Column({
    type: "enum",
    name: "landing_work_with_us_second",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionWorkWithUsSecond: ELandingSection | null;

  @Column({ type: "varchar", name: "image_work_with_us_second", nullable: true })
  imageWorkWithUsSecond: string | null;

  @Column({ type: "varchar", name: "position_work_with_us_second", nullable: true })
  positionWorkWithUsSecond: string | null;

  @Column({ type: "varchar", name: "title_work_with_us_third", nullable: true })
  titleWorkWithUsThird: string | null;

  @Column({ type: "varchar", name: "description_work_with_us_third", nullable: true })
  descriptionWorkWithUsThird: string | null;

  @Column({
    type: "enum",
    name: "landing_work_with_us_third",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionWorkWithUsThird: ELandingSection | null;

  @Column({ type: "varchar", name: "image_work_with_us_third", nullable: true })
  imageWorkWithUsThird: string | null;

  @Column({ type: "varchar", name: "position_work_with_us_third", nullable: true })
  positionWorkWithUsThird: string | null;

  @Column({ type: "varchar", name: "title_work_with_us_fourth", nullable: true })
  titleWorkWithUsFourth: string | null;

  @Column({ type: "varchar", name: "description_work_with_us_fourth", nullable: true })
  descriptionWorkWithUsFourth: string | null;

  @Column({
    type: "enum",
    name: "landing_work_with_us_fourth",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionWorkWithUsFourth: ELandingSection | null;

  @Column({ type: "varchar", name: "image_work_with_us_fourth", nullable: true })
  imageWorkWithUsFourth: string | null;

  @Column({ type: "varchar", name: "position_work_with_us_fourth", nullable: true })
  positionWorkWithUsFourth: string | null;

  @Column({ type: "varchar", name: "title_company_values_top_left", nullable: true })
  titleCompanyValuesTopLeft: string | null;

  @Column({ type: "varchar", name: "description_company_values_top_left", nullable: true })
  descriptionCompanyValuesTopLeft: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_top_left",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesTopLeft: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_top_left", nullable: true })
  imageCompanyValuesTopLeft: string | null;

  @Column({ type: "varchar", name: "position_company_values_top_left", nullable: true })
  positionCompanyValuesTopLeft: string | null;

  @Column({ type: "varchar", name: "title_company_values_top_middle", nullable: true })
  titleCompanyValuesTopMiddle: string | null;

  @Column({ type: "varchar", name: "description_company_values_top_middle", nullable: true })
  descriptionCompanyValuesTopMiddle: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_top_middle",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesTopMiddle: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_top_middle", nullable: true })
  imageCompanyValuesTopMiddle: string | null;

  @Column({ type: "varchar", name: "position_company_values_top_middle", nullable: true })
  positionCompanyValuesTopMiddle: string | null;

  @Column({ type: "varchar", name: "title_company_values_top_right", nullable: true })
  titleCompanyValuesTopRight: string | null;

  @Column({ type: "varchar", name: "description_company_values_top_right", nullable: true })
  descriptionCompanyValuesTopRight: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_top_right",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesTopRight: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_top_right", nullable: true })
  imageCompanyValuesTopRight: string | null;

  @Column({ type: "varchar", name: "position_company_values_top_right", nullable: true })
  positionCompanyValuesTopRight: string | null;

  @Column({ type: "varchar", name: "title_company_values_middle_left", nullable: true })
  titleCompanyValuesMiddleLeft: string | null;

  @Column({ type: "varchar", name: "description_company_values_middle_left", nullable: true })
  descriptionCompanyValuesMiddleLeft: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_middle_left",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesMiddleLeft: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_middle_left", nullable: true })
  imageCompanyValuesMiddleLeft: string | null;

  @Column({ type: "varchar", name: "position_company_values_middle_left", nullable: true })
  positionCompanyValuesMiddleLeft: string | null;

  @Column({ type: "varchar", name: "title_company_values_middle", nullable: true })
  titleCompanyValuesMiddle: string | null;

  @Column({ type: "varchar", name: "description_company_values_middle", nullable: true })
  descriptionCompanyValuesMiddle: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_middle",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesMiddle: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_middle", nullable: true })
  imageCompanyValuesMiddle: string | null;

  @Column({ type: "varchar", name: "position_company_values_middle", nullable: true })
  positionCompanyValuesMiddle: string | null;

  @Column({ type: "varchar", name: "title_company_values_middle_right", nullable: true })
  titleCompanyValuesMiddleRight: string | null;

  @Column({ type: "varchar", name: "description_company_values_middle_right", nullable: true })
  descriptionCompanyValuesMiddleRight: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_middle_right",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesMiddleRight: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_middle_right", nullable: true })
  imageCompanyValuesMiddleRight: string | null;

  @Column({ type: "varchar", name: "position_company_values_middle_right", nullable: true })
  positionCompanyValuesMiddleRight: string | null;

  @Column({ type: "varchar", name: "title_company_values_left_bottom", nullable: true })
  titleCompanyValuesLeftBottom: string | null;

  @Column({ type: "varchar", name: "description_company_values_left_bottom", nullable: true })
  descriptionCompanyValuesLeftBottom: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_left_bottom",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesLeftBottom: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_left_bottom", nullable: true })
  imageCompanyValuesLeftBottom: string | null;

  @Column({ type: "varchar", name: "position_company_values_left_bottom", nullable: true })
  positionCompanyValuesLeftBottom: string | null;

  @Column({ type: "varchar", name: "title_company_values_middle_bottom", nullable: true })
  titleCompanyValuesMiddleBottom: string | null;

  @Column({ type: "varchar", name: "description_company_values_middle_bottom", nullable: true })
  descriptionCompanyValuesMiddleBottom: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_middle_bottom",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesMiddleBottom: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_middle_bottom", nullable: true })
  imageCompanyValuesMiddleBottom: string | null;

  @Column({ type: "varchar", name: "position_company_values_middle_bottom", nullable: true })
  positionCompanyValuesMiddleBottom: string | null;

  @Column({ type: "varchar", name: "title_company_values_right_bottom", nullable: true })
  titleCompanyValuesRightBottom: string | null;

  @Column({ type: "varchar", name: "description_company_values_right_bottom", nullable: true })
  descriptionCompanyValuesRightBottom: string | null;

  @Column({
    type: "enum",
    name: "landing_company_values_right_bottom",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionCompanyValuesRightBottom: ELandingSection | null;

  @Column({ type: "varchar", name: "image_company_values_right_bottom", nullable: true })
  imageCompanyValuesRightBottom: string | null;

  @Column({ type: "varchar", name: "position_company_values_right_bottom", nullable: true })
  positionCompanyValuesRightBottom: string | null;

  @Column({ type: "varchar", name: "title_social_media_linkedin", nullable: true })
  linkSocialMediaLinkedin: string | null;

  @Column({
    type: "enum",
    name: "landing_social_media_linkedin",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionSocialMediaLinkedin: ELandingSection | null;

  @Column({ type: "varchar", name: "position_social_media_linkedin", nullable: true })
  positionSocialMediaLinkedin: string | null;

  @Column({ type: "varchar", name: "title_social_media_facebook", nullable: true })
  linkSocialMediaFacebook: string | null;

  @Column({
    type: "enum",
    name: "landing_social_media_facebook",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionSocialMediaFacebook: ELandingSection | null;

  @Column({ type: "varchar", name: "position_social_media_facebook", nullable: true })
  positionSocialMediaFacebook: string | null;

  @Column({ type: "varchar", name: "title_social_media_instagram", nullable: true })
  linkSocialMediaInstagram: string | null;

  @Column({
    type: "enum",
    name: "landing_social_media_instagram",
    enum: ELandingSection,
    nullable: true,
  })
  landingSectionSocialMediaInstagram: ELandingSection | null;

  @Column({ type: "varchar", name: "position_social_media_instagram", nullable: true })
  positionSocialMediaInstagram: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
