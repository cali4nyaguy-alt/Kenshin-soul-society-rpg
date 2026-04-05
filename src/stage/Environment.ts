import { StageContext } from "./types";

export class Environment {
    constructor(public ctx: StageContext) {}

    log(...args: any[]) {
        console.log("[Stage Env]", ...args);
    }

    getConfig<T = any>(key: string, fallback?: T): T {
        return (this.ctx.config[key] as T) ?? fallback!;
    }

    setConfig(key: string, value: any) {
        this.ctx.config[key] = value;
    }
}