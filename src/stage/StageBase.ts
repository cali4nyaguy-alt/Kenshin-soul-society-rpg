import { StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  TInit extends Record<string, any> = Record<string, any>,
  TChat extends Record<string, any> = Record<string, any>,
  TMessage extends Record<string, any> = Record<string, any>,
  TConfig extends Record<string, any> = Record<string, any>
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: TInit, chat: TChat, config: TConfig) {
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