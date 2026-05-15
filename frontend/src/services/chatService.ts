import { api } from "@/lib/api";
import type { ChatMessage, ChatResponse } from "@/types/chat";

export const chatService = {
  send: (message: string, history: ChatMessage[]) =>
    api.post<ChatResponse>("/api/chat/", { message, history }),
};
