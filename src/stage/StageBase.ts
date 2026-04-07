import { StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  InitState = any,
  ChatState = any,
  MessageState = any,
  ConfigState = any
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: InitState, chat: ChatState, config: ConfigState) {
    this.ctx = {
      init: initial as any,
      chat: chat as any,
      message: {},
      config: config as any,
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