import { StageBase, InitialData } from "../stage";

export type InitStateType = any;
export type ChatStateType = any;
export type MessageStateType = any;
export type ConfigType = any;

/***
 A simple example class that implements the interfaces necessary for a Stage.
 If you rename this class, update App.js accordingly.
***/
export class Stage extends StageBase<
  InitStateType,
  ChatStateType,
  MessageStateType,
  ConfigType
> {

  /***
   A very simple example internal state. Can be anything.
   This is ephemeral in the sense that it isn't persisted to a database,
   but exists as long as the instance does, i.e., the chat page is open.
  ***/
  myInternalState: { [key: string]: any };

  constructor(
    data: InitialData<
      InitStateType,
      ChatStateType,
      MessageStateType,
      ConfigType
    >
  ) {
    super(data);

    const {
      characters,
      users,
      config,
      messageState,
      environment,
      initState,
      chatState
    } = data;

    // Restore or initialize internal state
    this.myInternalState = messageState != null ? messageState : {};

    // Your custom internal state values
    this.myInternalState["numChars"] = 0;
    this.myInternalState["numUsers"] = 0;
    this.myInternalState["hp"] = 100;
    this.myInternalState["bloodlust"] = 0;
  }

  /***
   Optional: implement init() if your Stage needs to set initial state.
   Leaving this out is fine unless your logic requires it.
  ***/
  async init() {
    return {
      initState: {},
      chatState: {},
      messageState: this.myInternalState,
      config: {}
    };
  }
}
