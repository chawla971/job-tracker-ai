import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Briefcase } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError(null);
    try {
      const result = await authService.googleLogin(credentialResponse.credential);
      login(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Briefcase size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Job Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">Your AI-powered job search assistant</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-medium">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your data is private and only accessible to you.
            </p>
          </div>

          <div className="flex justify-center">
            {loading ? (
              <div className="text-sm text-muted-foreground">Signing in...</div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed. Try again.")}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="280"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
