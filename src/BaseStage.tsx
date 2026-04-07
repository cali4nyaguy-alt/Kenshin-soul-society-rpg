import React from 'react';

// ─── StageProps: minimal compat type for the Stage constructor ───────
export interface StageProps {
  [key: string]: any;
}

/**
 * BaseStage
 *
 * Thin shim that the concrete Stage class extends.
 * Provides `myInternalState` (the RPG brain) and stubs for
 * the lifecycle methods that @chub-ai/stages-ts expects.
 */
export abstract class BaseStage {
  myInternalState: Record<string, any>;

  constructor(_props?: StageProps) {
    this.myInternalState = {};
  }

  /** Lifecycle: called right after construction. */
  async load(): Promise<any> { return {}; }

  /** Lifecycle: called on state reset / swipe. */
  async setState(_state: any): Promise<void> { /* no-op */ }

  /** Lifecycle: called before prompt is sent to LLM. */
  async beforePrompt(_msg: any): Promise<any> { return {}; }

  /** Lifecycle: called after LLM response. */
  async afterResponse(_msg: any): Promise<any> { return {}; }

  /** Override in Stage to return the React tree. */
  abstract render(): React.ReactElement;
}
