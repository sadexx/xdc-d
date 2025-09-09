import { Body, Controller, Get, Patch, Post, Query, SerializeOptions, UseGuards, UsePipes } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { InterpreterQuestionnaire } from "src/modules/interpreters/questionnaire/entities";
import { InterpreterQuestionnaireService } from "src/modules/interpreters/questionnaire/services";
import {
  QuestionnaireLanguageBuddyOutput,
  QuestionnaireOutput,
} from "src/modules/interpreters/questionnaire/common/outputs";
import {
  CreateInterpreterQuestionnaireDto,
  CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
  GetInterpreterQuestionnaireDto,
  UpdateInterpreterQuestionnaireDto,
} from "src/modules/interpreters/questionnaire/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { NotEmptyBodyPipe } from "src/common/pipes";

@Controller("users/me")
export class InterpreterQuestionnaireController {
  constructor(private readonly questionnaireService: InterpreterQuestionnaireService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Post("questionnaire")
  @SerializeOptions({ type: QuestionnaireOutput })
  create(@Body() dto: CreateInterpreterQuestionnaireDto, @CurrentUser() user: ITokenUserData): Promise<IMessageOutput> {
    return this.questionnaireService.create(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Post("questionnaire/language-buddy")
  @SerializeOptions({ type: QuestionnaireLanguageBuddyOutput })
  createServices(
    @Body() dto: CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return this.questionnaireService.createServices(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("questionnaire")
  @SerializeOptions({ type: QuestionnaireOutput })
  findCurrentUserQuestionnaire(
    @Query() dto: GetInterpreterQuestionnaireDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<InterpreterQuestionnaire> {
    return this.questionnaireService.findOneByUserIdAndRole(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch("questionnaire")
  @SerializeOptions({ type: QuestionnaireOutput })
  update(@Body() dto: UpdateInterpreterQuestionnaireDto, @CurrentUser() user: ITokenUserData): Promise<IMessageOutput> {
    return this.questionnaireService.update(user, dto);
  }
}
