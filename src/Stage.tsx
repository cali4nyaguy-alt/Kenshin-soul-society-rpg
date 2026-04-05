import {
  StageBase,
  InitialData,
  LoadResponse,
  StageResponse,
  Message,
} from "@chub-ai/stages-ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type InitStateType = any;
export type ChatStateType = any;
export type MessageStateType = any;
export type ConfigType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

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
  constructor(
    data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>
  ) {
    super(data);
  }

  // Called once when the stage starts
  async load(): Promise<
    Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>
  > {
    console.log("Stage loaded");
    return {};
  }

  // Called to handle state jumps/swipes
  async setState(_state: MessageStateType): Promise<void> {}

  // Called before a user message is sent to the LLM
  async beforePrompt(
    _inputMessage: Message
  ): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return {
      stageDirections: null,
      modifiedMessage: null,
      systemMessage: null,
      error: null,
    };
  }

  // Called after the LLM responds
  async afterResponse(
    _botMessage: Message
  ): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return {
      stageDirections: null,
      modifiedMessage: null,
      systemMessage: null,
      error: null,
    };
  }

  // Called to render UI (used by TestRunner)
  render() {
    return <div>Stage is running</div>;
  }
}
