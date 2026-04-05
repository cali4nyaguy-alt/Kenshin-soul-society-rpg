import { StageContext } from "./types";

export class Environment {
    constructor(public ctx: StageContext) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(...args: any[]) {
        console.log("[Stage Env]", ...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getConfig<T = any>(key: string, fallback?: T): T {
        return (this.ctx.config[key] as T) ?? fallback!;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setConfig(key: string, value: any) {
        this.ctx.config[key] = value;
    }
}