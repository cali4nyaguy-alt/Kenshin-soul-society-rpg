import React from 'react';

/**
 * StageProps: The three-argument constructor shape used by App.tsx and TestRunner.tsx.
 */
export interface StageProps {
  init: Record<string, any>;
  chat: Record<string, any>;
  config: Record<string, any>;
}

/**
 * BaseStage
 * Provides `myInternalState` (the game brain) and lifecycle stubs
 * that the concrete Stage class overrides.
 */
export abstract class BaseStage {
  myInternalState: Record<string, any>;

  constructor(init: Record<string, any>, chat: Record<string, any>, config: Record<string, any>) {
    this.myInternalState = {};
  }

  /** Called once after construction to perform async setup. */
  async load(): Promise<void> { /* no-op by default */ }

  /** Called to update state from outside. */
  setState(_patch: Record<string, any>): void { /* no-op by default */ }

  /** Abstract render – subclass must provide UI. */
  abstract render(): React.ReactNode;
}
