import { InitState } from "./types";

export interface InitialData {
    state: InitState;
    createdAt: number;
}

export function createInitialData( state: InitState = {} ): InitialData {
    return {
        state,
        createdAt: Date.now(),
    };
}