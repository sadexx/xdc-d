import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContactForm } from "src/modules/contact-form/entities";
import { CreateContactFormDto } from "src/modules/contact-form/common/dto";
import { GetAllContactFormsDto } from "src/modules/contact-form/common/dto";
import { GetAllContactFormsOutput } from "src/modules/contact-form/common/outputs";
import { ESortOrder } from "src/common/enums";

export class ContactFormService {
  constructor(
    @InjectRepository(ContactForm)
    private readonly contactFormRepository: Repository<ContactForm>,
  ) {}

  public async getAll(dto: GetAllContactFormsDto): Promise<GetAllContactFormsOutput> {
    const [contactForms, count] = await this.contactFormRepository.findAndCount({
      skip: dto.offset,
      take: dto.limit,
      order: {
        creationDate: ESortOrder.DESC,
      },
    });

    return {
      data: contactForms,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async createContactForm(dto: CreateContactFormDto): Promise<void> {
    const contactForm = this.contactFormRepository.create(dto);
    await this.contactFormRepository.save(contactForm);
  }

  public async setViewedContactForm(id: string): Promise<void> {
    await this.contactFormRepository.update(id, { isViewed: true });
  }
}
