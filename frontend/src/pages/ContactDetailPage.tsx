import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, ExternalLink, Pencil, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/ContactForm";
import { CoffeeChatForm } from "@/components/CoffeeChatForm";
import { contactService, coffeeChatService } from "@/services/contactService";
import { jobService } from "@/services/jobService";
import type { ContactWithChats, CoffeeChat, ContactUpdate } from "@/types/contact";
import type { Job } from "@/types/job";
import { formatDateTime } from "@/lib/time";

const STATUS_LABELS: Record<string, string> = {
  awaiting_response: "Awaiting Response",
  responded: "Responded",
  chat_scheduled: "Chat Scheduled",
  chat_done: "Chat Done",
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactWithChats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showChatForm, setShowChatForm] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      contactService.getOne(id).then(setContact),
      jobService.getAll().then(setJobs),
    ]).finally(() => setLoading(false));
  }, [id]);

  async function handleContactUpdate(data: ContactUpdate) {
    if (!id) return;
    const updated = await contactService.update(id, data);
    setContact((prev) => prev ? { ...updated, coffee_chats: prev.coffee_chats } : null);
    setEditing(false);
  }

  async function handleAddChat(data: Parameters<typeof coffeeChatService.create>[0]) {
    const created = await coffeeChatService.create(data);
    setContact((prev) => prev ? { ...prev, coffee_chats: [created, ...prev.coffee_chats] } : null);
    setShowChatForm(false);
  }

  async function handleUpdateChat(chatId: string, data: Parameters<typeof coffeeChatService.update>[1]) {
    const updated = await coffeeChatService.update(chatId, data);
    setContact((prev) =>
      prev ? { ...prev, coffee_chats: prev.coffee_chats.map((c) => (c.id === chatId ? updated : c)) } : null
    );
    setEditingChatId(null);
  }

  async function handleDeleteChat(chatId: string) {
    await coffeeChatService.delete(chatId);
    setContact((prev) =>
      prev ? { ...prev, coffee_chats: prev.coffee_chats.filter((c) => c.id !== chatId) } : null
    );
  }

  async function handleDeleteContact() {
    if (!id || !confirm("Delete this contact? This will also delete all coffee chats.")) return;
    await contactService.delete(id);
    navigate("/contacts");
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>;
  if (!contact) return <div className="max-w-3xl mx-auto px-4 py-8 text-muted-foreground">Contact not found.</div>;

  const linkedJob = contact.job_id ? jobs.find((j) => j.id === contact.job_id) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/contacts")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to Contacts
      </button>

      {/* Contact header / edit form */}
      {editing ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-medium mb-4">Edit Contact</h2>
          <ContactForm
            initial={contact}
            jobs={jobs}
            onSubmit={handleContactUpdate}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{contact.name}</h1>
                {contact.linkedin_url && (
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {contact.company && <p className="text-muted-foreground text-sm mt-0.5">{contact.company}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} title="Edit">
                <Pencil size={15} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDeleteContact}
                className="text-destructive hover:text-destructive" title="Delete">
                <Trash2 size={15} />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium mt-0.5">{STATUS_LABELS[contact.status]}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Outreach Date</span>
              <p className="font-medium mt-0.5">{contact.outreach_date}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Follow-up Date</span>
              <p className={`font-medium mt-0.5 ${contact.is_overdue ? "text-orange-600" : ""}`}>
                {contact.follow_up_date ?? "—"}
                {contact.is_overdue && " (overdue)"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Linked Job</span>
              <p className="font-medium mt-0.5">
                {linkedJob ? (
                  <button
                    className="hover:underline text-left"
                    onClick={() => navigate(`/jobs/${linkedJob.id}`)}
                  >
                    {linkedJob.company_name} — {linkedJob.role_title}
                  </button>
                ) : (
                  <span className="italic text-muted-foreground">General networking</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coffee Chats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Coffee Chats ({contact.coffee_chats.length})
          </h2>
          <Button size="sm" onClick={() => setShowChatForm((v) => !v)}>
            {showChatForm ? <><X size={14} className="mr-1" />Cancel</> : <><Plus size={14} className="mr-1" />Add Chat</>}
          </Button>
        </div>

        {showChatForm && (
          <div className="rounded-lg border bg-card p-5">
            <CoffeeChatForm
              contactId={contact.id}
              onSubmit={handleAddChat}
              onCancel={() => setShowChatForm(false)}
            />
          </div>
        )}

        {contact.coffee_chats.length === 0 && !showChatForm && (
          <div className="text-sm text-muted-foreground py-4">No coffee chats recorded yet.</div>
        )}

        {contact.coffee_chats.map((chat) =>
          editingChatId === chat.id ? (
            <div key={chat.id} className="rounded-lg border bg-card p-5">
              <CoffeeChatForm
                contactId={contact.id}
                initial={chat}
                onSubmit={(data) => handleUpdateChat(chat.id, data)}
                onCancel={() => setEditingChatId(null)}
              />
            </div>
          ) : (
            <ChatCard
              key={chat.id}
              chat={chat}
              onEdit={() => setEditingChatId(chat.id)}
              onDelete={() => handleDeleteChat(chat.id)}
            />
          )
        )}
      </div>
    </div>
  );
}

function ChatCard({
  chat,
  onEdit,
  onDelete,
}: {
  chat: CoffeeChat;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium">{formatDateTime(chat.date_time)}</p>
          {chat.meeting_link && (
            <a
              href={chat.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
            >
              <Video size={12} /> Join meeting
            </a>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}
            className="text-destructive hover:text-destructive" title="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      {chat.notes ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{chat.notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes recorded.</p>
      )}
    </div>
  );
}
