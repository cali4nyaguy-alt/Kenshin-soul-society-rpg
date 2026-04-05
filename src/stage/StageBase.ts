import { StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  InitState extends Record<string, any> = any,
  ChatState extends Record<string, any> = any,
  MessageState extends Record<string, any> = any,
  ConfigState extends Record<string, any> = any
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: InitState, chat: ChatState, config: ConfigState) {
    this.ctx = {
      init: initial,
      chat,
      message: {},
      config,
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