import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Briefcase, Link2, Sparkles, BarChart3, FileSpreadsheet, Github, Loader2 } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  {
    icon: <Link2 size={22} className="text-[#378ADD]" />,
    title: "Paste a URL, we do the rest",
    desc: "Auto-extracts company, role, location, and the full job description from any job posting. Ashby, Greenhouse, Lever, and more.",
  },
  {
    icon: <Sparkles size={22} className="text-[#378ADD]" />,
    title: "AI that actually knows your search",
    desc: "Ask it to prep for interviews, find skill gaps, or recall past coffee chats. It has full context of your resume and pipeline.",
  },
  {
    icon: <BarChart3 size={22} className="text-[#378ADD]" />,
    title: "Your pipeline at a glance",
    desc: "Track every application from saved → applied → interviewing → offer. Dashboard with calendar, action items, and metrics.",
  },
  {
    icon: <FileSpreadsheet size={22} className="text-[#378ADD]" />,
    title: "Using spreadsheets? Bring them.",
    desc: "Import your existing CSV or Excel tracker in one click with smart column detection and editable preview. No starting over.",
  },
];

function GoogleSignInButton({ size = "default" }: { size?: "default" | "large" }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuccess(resp: { credential?: string }) {
    if (!resp.credential) return;
    setLoading(true);
    try {
      const result = await authService.googleLogin(resp.credential);
      login(result.token, result.user);
    } catch (e) {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Signing in...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Sign-in failed. Please try again.")}
        theme="outline"
        size={size === "large" ? "large" : "medium"}
        text="signin_with"
        shape="rectangular"
        width={size === "large" ? "260" : "220"}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Briefcase size={14} className="text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Job Tracker</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden py-24 px-6">
        {/* Mesh gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(55,138,221,0.18) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground mb-2">
            <Sparkles size={12} className="text-primary" />
            AI-powered · Free to use
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            Your AI-Powered{" "}
            <span className="text-[#378ADD]">Job Search Copilot</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Track applications, prep for interviews, and get AI insights — all in one place.
            No more spreadsheet chaos.
          </p>
          <div className="flex justify-center pt-2">
            <GoogleSignInButton size="large" />
          </div>
          <p className="text-xs text-muted-foreground">
            Free to use · Your data stays private
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Everything you need to run a better job search
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="rounded-xl border bg-secondary p-6 space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshot ───────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-2xl font-semibold">See it in action</h2>
          <div
            className="rounded-2xl border overflow-hidden shadow-2xl mx-auto max-w-4xl"
            style={{ transform: "perspective(1200px) rotateX(2deg)" }}
          >
            <img
              src="/dashboard.png"
              alt="Job Tracker dashboard"
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">
          Ready to take control of your job search?
        </h2>
        <p className="text-muted-foreground">Join and start tracking smarter today.</p>
        <button
          onClick={() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" })}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Get Started Free →
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
              <Briefcase size={11} className="text-primary-foreground" />
            </div>
            <span>Job Tracker · Built by Sahil Chawla</span>
          </div>
          <a
            href="https://github.com/chawla971/job-tracker-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Github size={15} />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
