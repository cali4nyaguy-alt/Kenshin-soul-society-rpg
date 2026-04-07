import React from 'react';

/**
 * Props passed to Stage on construction.
 * Mirrors what App.tsx and TestRunner.tsx already supply.
 */
export interface StageProps {
  state?: Record<string, any>;
  [key: string]: any;
}

/**
 * Minimal base class that provides `myInternalState`, `load()`,
 * `render()`, and a `requestUpdate()` hook used by the Stage subclass.
 *
 * This file exists because the original codebase referenced it but
 * never committed it.  It bridges Stage.tsx to the rest of the app.
 */
export abstract class BaseStage {
  myInternalState: Record<string, any>;

  constructor(_props: StageProps) {
    this.myInternalState = {};
  }

  /** Override in subclass if async initialisation is needed. */
  async load(): Promise<void> {}

  /** Must be implemented by Stage. */
  abstract render(): React.ReactElement | null;
}
