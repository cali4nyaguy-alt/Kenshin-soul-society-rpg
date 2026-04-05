import { InitialData, Message, LoadResponse, StageResponse } from "@chub-ai/stages-ts";
import { StageBase } from "./stage";

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
    this.env.log("Stage loaded");
    return { success: true, error: null };
  }

  // Called when the stage state changes (e.g. after a chat branch/swipe)
  async setState(state: MessageStateType): Promise<void> {
    void state; // no-op by default; override if your stage tracks message-level state
  }

  // Called before the user's message is sent to the LLM
  async beforePrompt(inputMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    void inputMessage;
    return { error: null };
  }

  // Called after the LLM responds
  async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    void botMessage;
    return { error: null };
  }

  // Called to render UI (used by TestRunner)
  render() {
    return <div>Stage is running</div>;
  }
}
