import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Loader2, Sparkles, ChevronDown, ChevronUp,
  Copy, Check, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatService } from "@/services/chatService";
import { jobService } from "@/services/jobService";
import type { ChatMessage, SourceChunk } from "@/types/chat";
import type { Job } from "@/types/job";

const MAX_HISTORY = 15;         // messages sent to LLM as context
const TEXTAREA_MAX_HEIGHT = 240; // px — ~6 lines before textarea scrolls

type DisplayMessage = ChatMessage & { sources?: SourceChunk[] };

const STATIC_SHORTCUTS = [
  {
    label: "Summarize my pipeline",
    prompt:
      "Give me a concise summary of where I stand in my job search. What companies am I in active conversations with, and what are the next steps?",
  },
  {
    label: "Find skill gaps",
    prompt:
      "Looking at the job descriptions I've saved and my resume, what skills or experience am I consistently missing? What should I prioritize learning?",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy response"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
}

function SourcesPanel({ sources }: { sources: SourceChunk[] }) {
  const [open, setOpen] = useState(false);
  const fmt = (t: string) =>
    t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mt-1 px-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        Context used ({sources.length} chunk{sources.length !== 1 ? "s" : ""})
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border bg-muted/20 p-3 space-y-3">
          {sources.map((s, i) => (
            <div key={i}>
              <p className="text-[11px] font-medium text-foreground">{fmt(s.source_type)}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-3 mt-0.5">{s.chunk_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={isUser ? "max-w-[80%]" : "max-w-[85%] w-full"}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          {isUser ? (
            msg.content
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold mt-3 mb-1 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-medium mt-2 mb-0.5 first:mt-0">{children}</h3>
                ),
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5">{children}</ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                pre: ({ children }) => (
                  <pre className="bg-background/60 rounded-lg p-3 overflow-x-auto text-xs font-mono my-2">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  const isBlock = !!className;
                  return isBlock ? (
                    <code className={className}>{children}</code>
                  ) : (
                    <code className="bg-background/60 rounded px-1 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground my-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && (
          <div className="flex items-start gap-1 mt-0.5">
            <CopyButton text={msg.content} />
            {msg.sources && msg.sources.length > 0 && <SourcesPanel sources={msg.sources} />}
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewPicker({
  jobs,
  onSelect,
  onClose,
}: {
  jobs: Job[] | null;
  onSelect: (job: Job) => void;
  onClose: () => void;
}) {
  if (jobs === null) {
    return (
      <div className="border rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 size={13} className="animate-spin shrink-0" />
        Loading interviews...
      </div>
    );
  }
  if (jobs.length === 0) {
    return (
      <div className="border rounded-lg p-3 space-y-1">
        <p className="text-sm text-muted-foreground">
          No jobs with "Interviewing" status found.
        </p>
        <p className="text-xs text-muted-foreground">
          Change a job's status to Interviewing first.
        </p>
        <button onClick={onClose} className="text-xs text-primary hover:underline">
          Dismiss
        </button>
      </div>
    );
  }
  return (
    <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground">Select a job to prep for</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={13} />
        </button>
      </div>
      {jobs.map((job) => (
        <button
          key={job.id}
          onClick={() => onSelect(job)}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b last:border-b-0"
        >
          <span className="font-medium">{job.company_name}</span>
          <span className="text-muted-foreground"> — {job.role_title}</span>
        </button>
      ))}
    </div>
  );
}

export function ChatPage() {
  const { user } = useAuth();
  const storageKey = `chat_history_${user?.id ?? "default"}`;

  const [messages, setMessages] = useState<DisplayMessage[]>(() => {
    try {
      const stored = localStorage.getItem(`chat_history_${user?.id ?? "default"}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInterviewPicker, setShowInterviewPicker] = useState(false);
  const [interviewJobs, setInterviewJobs] = useState<Job[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Resize textarea whenever input is set programmatically (shortcuts, interview picker)
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
  }, [input]);

  async function handleSend(overrideMessage?: string) {
    const text = (overrideMessage ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setShowInterviewPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: DisplayMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const history: ChatMessage[] = nextMessages
        .slice(0, -1)
        .slice(-MAX_HISTORY)
        .map(({ role, content }) => ({ role, content }));
      const response = await chatService.send(text, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply, sources: response.sources },
      ]);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      let friendly = raw;
      if (
        raw.toLowerCase().includes("failed to fetch") ||
        raw.toLowerCase().includes("network")
      ) {
        friendly = "Could not reach the server. Make sure the app is running.";
      } else if (raw.includes("502") || raw.includes("503")) {
        friendly = "The server is temporarily unavailable. Try again in a moment.";
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I ran into an issue: ${friendly}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrepInterview() {
    setShowInterviewPicker(true);
    setInterviewJobs(null);
    try {
      const allJobs = await jobService.getAll();
      const interviewing = allJobs.filter((j) => j.status === "interviewing");
      setInterviewJobs(interviewing);
      if (interviewing.length === 1) {
        setShowInterviewPicker(false);
        const job = interviewing[0];
        setInput(
          `Help me prepare for my interview at ${job.company_name} for the ${job.role_title} role. Based on the JD and my resume, what key topics, likely questions, and talking points should I focus on?`
        );
        textareaRef.current?.focus();
      }
    } catch {
      setInterviewJobs([]);
    }
  }

  function handleJobSelect(job: Job) {
    setShowInterviewPicker(false);
    setInput(
      `Help me prepare for my interview at ${job.company_name} for the ${job.role_title} role. Based on the JD and my resume, what key topics, likely questions, and talking points should I focus on?`
    );
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleShortcut(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Clear chat button — only shown once conversation has started */}
      {!isEmpty && (
        <div className="border-b px-4 py-2 flex justify-end">
          <button
            onClick={() => { setMessages([]); localStorage.removeItem(storageKey); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 size={13} />
            Clear chat
          </button>
        </div>
      )}

      {/* Message area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Sparkles size={24} className="text-primary" />
              </div>
              <h2 className="text-lg font-semibold">AI Job Search Assistant</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask anything about your applications, prep for interviews, or find skill gaps.
                I have context from your resume, job descriptions, and notes.
              </p>
              <ChevronDown size={16} className="text-muted-foreground mt-4 animate-bounce" />
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-background">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
          {/* Shortcut buttons — hidden once conversation starts */}
          {isEmpty && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrepInterview}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                Prep for interview
              </button>
              {STATIC_SHORTCUTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleShortcut(s.prompt)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Interview job picker */}
          {showInterviewPicker && (
            <InterviewPicker
              jobs={interviewJobs}
              onSelect={handleJobSelect}
              onClose={() => setShowInterviewPicker(false)}
            />
          )}

          {/* Text input + send */}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your applications, prep for an interview…  (Enter to send, Shift+Enter for new line)"
              className="resize-none text-sm overflow-hidden"
              style={{ minHeight: "44px" }}
              rows={1}
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="shrink-0 h-10 w-10"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Context includes your resume, job descriptions, coffee chat notes, and interview prep.
          </p>
        </div>
      </div>
    </div>
  );
}
