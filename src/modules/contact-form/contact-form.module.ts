import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContactFormController } from "src/modules/contact-form/controllers";
import { ContactFormService } from "src/modules/contact-form/services";
import { ContactForm } from "src/modules/contact-form/entities";

@Module({
  imports: [TypeOrmModule.forFeature([ContactForm])],
  controllers: [ContactFormController],
  providers: [ContactFormService],
  exports: [ContactFormService],
})
export class ContactFormModule {}
