import { StageContext, InitState, ChatState, ConfigState } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  I extends InitState = InitState,
  C extends ChatState = ChatState,
  _M = any,
  Cfg extends ConfigState = ConfigState
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: I, chat: C, config: Cfg) {
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