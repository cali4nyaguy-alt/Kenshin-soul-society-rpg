import { LoadResponse } from "@chub-ai/stages-ts";
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
  // Called once when the stage starts
  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    this.env.log("Stage loaded");
    return { success: true, error: null };
  }

  // Called when the user sends a message
  async onUserMessage(msg: string) {
    return [this.reply(`You said: ${msg}`)];
  }

  // Called to render UI (used by TestRunner)
  render() {
    return <div>Stage is running</div>;
  }
}
