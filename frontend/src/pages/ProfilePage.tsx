import { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { profileService } from "@/services/profileService";
import type { UserProfile } from "@/types/profile";
import { formatDate } from "@/lib/time";

type EmbedStatus = "idle" | "embedding" | "done";

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileService.get().then((p) => {
      setProfile(p);
      setResumeText(p.resume_text ?? "");
      setAboutMe(p.about_me ?? "");
    });
  }, []);

  function showEmbedding() {
    setEmbedStatus("embedding");
    // Embedding runs in the background on the server — give it ~8s then show done
    setTimeout(() => {
      setEmbedStatus("done");
      setTimeout(() => setEmbedStatus("idle"), 3000);
    }, 8000);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await profileService.update({
        resume_text: resumeText,
        about_me: aboutMe,
      });
      setProfile(updated);
      showEmbedding();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const updated = await profileService.uploadResume(file);
      setProfile(updated);
      setResumeText(updated.resume_text ?? "");
      showEmbedding();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Make sure the file is a PDF, DOCX, or TXT.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your resume and background — used by the AI assistant to personalize answers and find skill gaps.
          {profile?.updated_at && (
            <span className="ml-2 text-xs">Last updated {formatDate(profile.updated_at)}</span>
          )}
        </p>
      </div>

      {/* Resume */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Resume</Label>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
            >
              {uploading ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Parsing resume...</>
              ) : (
                <><Upload size={14} className="mr-1.5" />Upload PDF / DOCX</>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a file to auto-extract the text, or paste it directly below.
        </p>

        {/* Indeterminate progress bar shown while server is parsing the PDF */}
        {uploading && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[progress_1.5s_ease-in-out_infinite]"
              style={{ width: "40%", animation: "progress 1.5s ease-in-out infinite" }} />
          </div>
        )}

        <Textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here, or upload a PDF/DOCX above..."
          className="min-h-[220px] font-mono text-xs"
        />
      </section>

      {/* About Me */}
      <section className="space-y-3">
        <Label className="text-base font-medium">About Me</Label>
        <p className="text-xs text-muted-foreground">
          Anything not on your resume: side projects, skills you're learning,
          career goals, the kinds of roles you're targeting.
        </p>
        <Textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="e.g. I'm a backend engineer transitioning into ML engineering. Currently learning PyTorch..."
          className="min-h-[140px]"
        />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Saving...</> : "Save Profile"}
        </Button>

        {/* Embedding status — non-blocking indicator */}
        {embedStatus === "embedding" && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Embedding in background...
          </span>
        )}
        {embedStatus === "done" && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle size={15} />
            Saved and embedded
          </span>
        )}
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">What gets embedded automatically</p>
        <p>· Resume text and About Me — when you save this page</p>
        <p>· Job descriptions — when you add or edit a job with JD text</p>
        <p>· Coffee chat notes — when you save a chat</p>
        <p>· Interview prep and post-interview notes — when you save an interview</p>
        <p className="pt-1">Embedding runs in the background — the app stays responsive while it processes.</p>
      </div>
    </div>
  );
}
