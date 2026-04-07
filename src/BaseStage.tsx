import React from 'react';
import { StageBase as LibStageBase, InitialData } from '@chub-ai/stages-ts';

/**
 * StageProps — alias for the library's InitialData.
 */
export type StageProps = InitialData<any, any, any, any>;

/**
 * BaseStage — abstract base for the RPG stage.
 * Extends the library's StageBase so ReactRunner is satisfied.
 * Provides myInternalState storage.
 */
export abstract class BaseStage extends LibStageBase<any, any, any, any> {
  myInternalState: Record<string, any> = {};

  constructor(data: StageProps) {
    super(data);
  }

  /** Default load — subclasses may override. */
  async load() {
    return {};
  }

  /** Default setState — subclasses may override. */
  async setState(_state: any) {
    /* noop */
  }

  /** Default beforePrompt — subclasses may override. */
  async beforePrompt(_msg: any) {
    return {};
  }

  /** Default afterResponse — subclasses may override. */
  async afterResponse(_msg: any) {
    return {};
  }

  /** Render the HUD / overlay — must be implemented by the concrete Stage. */
  abstract render(): React.ReactElement;
}
