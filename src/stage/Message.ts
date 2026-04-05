export interface Message {
    id: string;
    role: "system" | "user" | "assistant";
    content: string;
    timestamp: number;
}

export function createMessage( role: Message["role"], content: string ): Message {
    return {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: Date.now(),
    };
}