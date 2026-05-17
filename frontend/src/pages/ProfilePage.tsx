import { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { profileService } from "@/services/profileService";
import type { UserProfile } from "@/types/profile";
import { formatDate } from "@/lib/time";

function ResumeDisplay({ text }: { text: string }) {
  return (
    <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/85 max-h-[400px] overflow-y-auto">
      {text}
    </pre>
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" | "error"; message?: string }) {
  if (status === "saving") return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Loader2 size={13} className="animate-spin" />Saving...
    </span>
  );
  if (status === "saved") return (
    <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
      <CheckCircle size={13} />Saved
    </span>
  );
  if (status === "error") return (
    <span className="text-sm text-destructive">{message ?? "Save failed"}</span>
  );
  return null;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Resume section state
  const [resumeText, setResumeText] = useState("");
  const [editingResume, setEditingResume] = useState(false);
  const [resumeStatus, setResumeStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [resumeError, setResumeError] = useState("");

  // About Me section state
  const [aboutMe, setAboutMe] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutStatus, setAboutStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [aboutError, setAboutError] = useState("");

  // Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileService.get().then((p) => {
      setProfile(p);
      setResumeText(p.resume_text ?? "");
      setAboutMe(p.about_me ?? "");
    });
  }, []);

  async function handleSaveResume() {
    setResumeStatus("saving");
    setResumeError("");
    try {
      const updated = await profileService.update({ resume_text: resumeText });
      setProfile(updated);
      setEditingResume(false);
      setResumeStatus("saved");
      setTimeout(() => setResumeStatus("idle"), 3000);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Save failed");
      setResumeStatus("error");
    }
  }

  async function handleSaveAbout() {
    setAboutStatus("saving");
    setAboutError("");
    try {
      const updated = await profileService.update({ about_me: aboutMe });
      setProfile(updated);
      setEditingAbout(false);
      setAboutStatus("saved");
      setTimeout(() => setAboutStatus("idle"), 3000);
    } catch (err) {
      setAboutError(err instanceof Error ? err.message : "Save failed");
      setAboutStatus("error");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await profileService.uploadResume(file);
      setProfile(updated);
      setResumeText(updated.resume_text ?? "");
      setEditingResume(false);
      setResumeStatus("saved");
      setTimeout(() => setResumeStatus("idle"), 3000);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Upload failed. Try PDF, DOCX, or TXT.");
      setResumeStatus("error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Profile</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Used by the AI to personalise answers and find skill gaps.
            {profile?.updated_at && (
              <span className="ml-2 text-xs">Last updated {formatDate(profile.updated_at)}</span>
            )}
          </p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading
              ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Parsing...</>
              : <><Upload size={14} className="mr-1.5" />Upload Resume</>}
          </Button>
        </div>
      </div>

      {/* ── Resume ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Resume</Label>
          {!editingResume ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingResume(true)}>
              <Pencil size={13} className="mr-1.5" />Edit
            </Button>
          ) : (
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => { setEditingResume(false); setResumeText(profile?.resume_text ?? ""); setResumeStatus("idle"); }}
            >
              <X size={13} />Cancel
            </button>
          )}
        </div>

        {editingResume ? (
          <>
            <Textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              className="min-h-[260px] font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSaveResume} disabled={resumeStatus === "saving"}>
                Save Resume
              </Button>
              <SaveStatus status={resumeStatus} message={resumeError} />
            </div>
          </>
        ) : resumeText ? (
          <div className="rounded-md bg-muted/20 border p-4">
            <ResumeDisplay text={resumeText} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No resume yet — upload a file above or click Edit to paste.
          </p>
        )}

        {!editingResume && resumeStatus !== "idle" && (
          <SaveStatus status={resumeStatus} message={resumeError} />
        )}
      </section>

      {/* ── About Me ───────────────────────────────────────────────── */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">About Me</Label>
          {!editingAbout ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingAbout(true)}>
              <Pencil size={13} className="mr-1.5" />Edit
            </Button>
          ) : (
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => { setEditingAbout(false); setAboutMe(profile?.about_me ?? ""); setAboutStatus("idle"); }}
            >
              <X size={13} />Cancel
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Side projects, skills you're learning, career goals, types of roles you're targeting.
        </p>

        {editingAbout ? (
          <>
            <Textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              placeholder="e.g. I'm a backend engineer transitioning into ML engineering..."
              className="min-h-[140px]"
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSaveAbout} disabled={aboutStatus === "saving"}>
                Save About Me
              </Button>
              <SaveStatus status={aboutStatus} message={aboutError} />
            </div>
          </>
        ) : aboutMe ? (
          <div className="rounded-md bg-muted/20 border p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {aboutMe}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nothing here yet — click Edit to add your background.
          </p>
        )}

        {!editingAbout && aboutStatus !== "idle" && (
          <SaveStatus status={aboutStatus} message={aboutError} />
        )}
      </section>

      <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">What gets embedded automatically</p>
        <p>· Resume and About Me — when you save each section</p>
        <p>· Job descriptions — when you add or edit a job with JD text</p>
        <p>· Coffee chat notes, interview prep and post-interview notes — on save</p>
        <p className="pt-1">Embedding runs in the background — the app stays responsive.</p>
      </div>
    </div>
  );
}
