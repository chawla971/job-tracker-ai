export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SourceChunk {
  source_type: string;
  chunk_text: string;
  distance: number;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  sources: SourceChunk[];
}
