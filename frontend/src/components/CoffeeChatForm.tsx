import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CoffeeChat, CoffeeChatCreate, CoffeeChatUpdate } from "@/types/contact";

interface CoffeeChatFormProps {
  contactId: string;
  initial?: CoffeeChat;
  onSubmit: (data: CoffeeChatCreate | CoffeeChatUpdate) => Promise<void>;
  onCancel: () => void;
}

export function CoffeeChatForm({ contactId, initial, onSubmit, onCancel }: CoffeeChatFormProps) {
  const defaultDateTime = new Date().toISOString().slice(0, 16);

  const [fields, setFields] = useState({
    date_time: initial ? new Date(initial.date_time).toISOString().slice(0, 16) : defaultDateTime,
    meeting_link: initial?.meeting_link ?? "",
    notes: initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
      try {
      const payload = {
        date_time: fields.date_time,
        meeting_link: fields.meeting_link || undefined,
        notes: fields.notes || undefined,
      };
      if (initial) {
        await onSubmit(payload as CoffeeChatUpdate);
      } else {
        await onSubmit({ ...payload, contact_id: contactId } as CoffeeChatCreate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="date_time">Date & Time *</Label>
        <input
          id="date_time"
          type="datetime-local"
          value={fields.date_time}
          onChange={(e) => setFields((p) => ({ ...p, date_time: e.target.value }))}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Meeting link — shown always but highlighted when upcoming */}
      <div className="space-y-1.5">
        <Label htmlFor="meeting_link">
          Meeting Link
        </Label>
        <Input
          id="meeting_link"
          type="url"
          value={fields.meeting_link}
          onChange={(e) => setFields((p) => ({ ...p, meeting_link: e.target.value }))}
          placeholder="https://meet.google.com/... or Zoom link"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={fields.notes}
          onChange={(e) => setFields((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Key takeaways, action items, topics discussed..."
          className="min-h-[100px]"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Update Chat" : "Add Coffee Chat"}
        </Button>
      </div>
    </form>
  );
}
