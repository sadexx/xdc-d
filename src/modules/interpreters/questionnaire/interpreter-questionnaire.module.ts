import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { InterpreterQuestionnaire, InterpreterRecommendation } from "src/modules/interpreters/questionnaire/entities";
import {
  InterpreterQuestionnaireController,
  InterpreterRecommendationController,
} from "src/modules/interpreters/questionnaire/controllers";
import {
  InterpreterQuestionnaireService,
  InterpreterRecommendationsService,
} from "src/modules/interpreters/questionnaire/services";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { UserRole } from "src/modules/users/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterQuestionnaire, InterpreterRecommendation, UserRole]),
    ActivationTrackingModule,
    InterpreterProfileModule,
    AccessControlModule,
  ],
  controllers: [InterpreterQuestionnaireController, InterpreterRecommendationController],
  providers: [InterpreterQuestionnaireService, InterpreterRecommendationsService],
  exports: [InterpreterQuestionnaireService],
})
export class InterpreterQuestionnaireModule {}
