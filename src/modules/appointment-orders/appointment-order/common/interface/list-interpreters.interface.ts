import { InterpreterProfile } from "src/modules/interpreters/profile/entities";

export interface IListInterpreters {
  interpreter: InterpreterProfile;
  type: IInterpreterOrderStatus;
}

type IInterpreterOrderStatus = "ignored" | "declined";
