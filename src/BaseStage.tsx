import React from 'react';

/**
 * StageProps – constructor argument for Stage.
 * Mirrors what App.tsx / TestRunner.tsx pass in.
 */
export interface StageProps {
  state?: Record<string, any>;
  chatState?: Record<string, any>;
  config?: Record<string, any>;
}

/**
 * BaseStage – lightweight React-compatible base class that
 * stores game state in `myInternalState`.
 */
export class BaseStage {
  myInternalState: Record<string, any>;

  constructor(_props: StageProps) {
    this.myInternalState = {};
  }

  /** Override in sub-class to return JSX. */
  render(): React.ReactNode {
    return null;
  }

  /** Lifecycle hook — called once after construction. */
  async load(): Promise<void> {}
}
