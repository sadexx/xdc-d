import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CreateContactFormDto } from "src/modules/contact-form/common/dto";
import { ContactFormService } from "src/modules/contact-form/services";
import { UUIDParamDto } from "src/common/dto";
import { GetAllContactFormsDto } from "src/modules/contact-form/common/dto";
import { GetAllContactFormsOutput } from "src/modules/contact-form/common/outputs";

@Controller("contact-forms")
export class ContactFormController {
  constructor(private readonly contactFormService: ContactFormService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get()
  async getAll(@Query() dto: GetAllContactFormsDto): Promise<GetAllContactFormsOutput> {
    return this.contactFormService.getAll(dto);
  }

  @Post()
  async create(@Body() dto: CreateContactFormDto): Promise<void> {
    return this.contactFormService.createContactForm(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("set-viewed/:id")
  async setViewedContactForm(@Param() { id }: UUIDParamDto): Promise<void> {
    return this.contactFormService.setViewedContactForm(id);
  }
}
