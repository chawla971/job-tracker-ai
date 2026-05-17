import { useState } from "react";
import { MessageSquarePlus, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { feedbackService, type FeedbackType } from "@/services/feedbackService";

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const MAX_CHARS = 500;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setDone(false);
    setError(null);
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await feedbackService.submit(type, description.trim());
      setDone(true);
      setTimeout(handleClose, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const charsLeft = MAX_CHARS - description.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <MessageSquarePlus size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-5 pointer-events-none">
          <div className="w-full max-w-sm bg-card border rounded-xl shadow-xl pointer-events-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-medium text-sm">Send Feedback</h3>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {done ? (
              <div className="px-4 py-8 text-center space-y-1">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Thanks for the feedback! ✓</p>
                <p className="text-xs text-muted-foreground">We'll look into it shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as FeedbackType)}
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                <div className="space-y-1">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Describe the issue or feature you'd like to see..."
                    className="min-h-[100px] resize-none text-sm"
                    required
                  />
                  <p className={`text-[11px] text-right ${charsLeft < 50 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {charsLeft} characters left
                  </p>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button type="submit" disabled={submitting || !description.trim()} className="w-full" size="sm">
                  {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                  {submitting ? "Sending..." : "Submit"}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  Or reach me directly:{" "}
                  <a href="https://www.linkedin.com/in/sahil-chawla-971sai/" target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline">LinkedIn</a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
