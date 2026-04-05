import { StageBase, InitialData, Message, LoadResponse, StageResponse } from "@chub-ai/stages-ts";
import { ReactElement } from "react";

export type InitStateType = any;
export type ChatStateType = any;
export type MessageStateType = any;
export type ConfigType = any;

/***
 A simple example class that implements the interfaces.
 If you rename this class, update App.tsx accordingly.
***/
export class Stage extends StageBase<
  InitStateType,
  ChatStateType,
  MessageStateType,
  ConfigType
> {
  constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
    super(data);
  }

  // Called once when the stage starts
  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    console.log("Stage loaded");
    return { success: true, error: null };
  }

  async setState(_state: MessageStateType): Promise<void> {}

  async beforePrompt(_inputMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return { error: null, modifiedMessage: null, stageDirections: null, systemMessage: null };
  }

  async afterResponse(_botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return { error: null, modifiedMessage: null, stageDirections: null, systemMessage: null };
  }

  // Called to render UI (used by TestRunner)
  render(): ReactElement {
    return <div>Stage is running</div>;
  }
}
