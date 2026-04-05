import { StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class StageBase<
  TInitState = any,
  TChatState = any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TMessageState = any,
  TConfigState = any
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: TInitState, chat: TChatState, config: TConfigState) {
    this.ctx = {
      init: initial as Record<string, any>,
      chat: chat as Record<string, any>,
      message: {},
      config: config as Record<string, any>,
    };
    this.env = new Environment(this.ctx);
  }

  abstract load(): Promise<void> | void;
  abstract onUserMessage(msg: string): Promise<Message[]> | Message[];

  protected reply(text: string): Message {
    return createMessage("assistant", text);
  }

  protected user(text: string): Message {
    return createMessage("user", text);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */