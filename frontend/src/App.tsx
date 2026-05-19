import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  Briefcase, LayoutDashboard, Users, Calendar, Sparkles,
  User, Moon, Sun, Menu, X, LogOut, ShieldCheck, Linkedin, Mail,
} from "lucide-react";
import { JobsPage } from "@/pages/JobsPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { ContactDetailPage } from "@/pages/ContactDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InterviewsPage } from "@/pages/InterviewsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { LandingPage } from "@/pages/LandingPage";
import { ChatPage } from "@/pages/ChatPage";
import { AdminPage } from "@/pages/AdminPage";
import { FeedbackButton } from "@/components/FeedbackButton";
import { jobService } from "@/services/jobService";
import { interviewService } from "@/services/interviewService";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/hooks/useAuth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function NavBadge({ count, color = "blue" }: { count: number; color?: "blue" | "coral" }) {
  if (count === 0) return null;
  return (
    <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
      color === "coral"
        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
        : "bg-[#E6F1FB] text-[#185FA5] dark:bg-blue-900/30 dark:text-blue-300"
    }`}>
      {count}
    </span>
  );
}

function SidebarContent({
  jobCount, interviewCount, theme, toggleTheme, onClose,
}: {
  jobCount: number; interviewCount: number;
  theme: "light" | "dark"; toggleTheme: () => void;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
      isActive
        ? "bg-[#E6F1FB] text-[#185FA5] font-medium dark:bg-blue-900/30 dark:text-blue-300"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[hsl(var(--sidebar-border))]">
        <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shrink-0">
            <Briefcase size={14} className="text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Job Tracker</span>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <NavLink to="/dashboard" className={navLinkClass} onClick={onClose}>
          <LayoutDashboard size={16} /><span>Dashboard</span>
        </NavLink>
        <NavLink to="/applications" className={navLinkClass} onClick={onClose}>
          <Briefcase size={16} /><span>Applications</span>
          <NavBadge count={jobCount} color="blue" />
        </NavLink>
        <NavLink to="/contacts" className={navLinkClass} onClick={onClose}>
          <Users size={16} /><span>Contacts</span>
        </NavLink>
        <NavLink to="/interviews" className={navLinkClass} onClick={onClose}>
          <Calendar size={16} /><span>Interviews</span>
          <NavBadge count={interviewCount} color="coral" />
        </NavLink>
        <NavLink to="/chat" className={navLinkClass} onClick={onClose}>
          <Sparkles size={16} /><span>AI Assistant</span>
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin" className={navLinkClass} onClick={onClose}>
            <ShieldCheck size={16} /><span>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-[hsl(var(--sidebar-border))] space-y-0.5">
        <NavLink to="/profile" className={navLinkClass} onClick={onClose}>
          <User size={16} /><span>Profile</span>
        </NavLink>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>

        {/* User info + sign out */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-2">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User size={12} className="text-primary" />
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate flex-1">{user.name}</span>
            <button
              onClick={logout}
              title="Sign out"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Builder signature */}
        <div className="px-3 pt-2 pb-1 border-t border-[hsl(var(--sidebar-border))] mt-1">
          <p className="text-[11px] text-muted-foreground/60 mb-1.5">Built by Sahil Chawla</p>
          <div className="flex items-center gap-1.5">
            <a
              href="https://www.linkedin.com/in/sahil-chawla-971sai/"
              target="_blank"
              rel="noopener noreferrer"
              title="Connect on LinkedIn"
              className="p-1 rounded text-muted-foreground hover:text-[#0A66C2] transition-colors"
            >
              <Linkedin size={15} />
            </a>
            <a
              href="mailto:sahil971chawla@gmail.com"
              title="Send me feedback"
              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail size={15} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const [jobCount, setJobCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  function refreshJobCount() {
    jobService.getAll().then((jobs) => {
      setJobCount(jobs.filter((j) => j.status !== "rejected").length);
    }).catch(() => {});
  }

  useEffect(() => {
    refreshJobCount();
    interviewService.getAll().then((ivs) => {
      const now = new Date();
      const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setInterviewCount(ivs.filter((iv) => {
        const d = new Date(iv.date_time);
        return d >= now && d <= cutoff;
      }).length);
    }).catch(() => {});

    window.addEventListener("jobsChanged", refreshJobCount);
    return () => window.removeEventListener("jobsChanged", refreshJobCount);
  }, []);

  const sidebarProps = { jobCount, interviewCount, theme, toggleTheme: toggle };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[200px] shrink-0 flex-col bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[200px] bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))] z-50 flex flex-col">
            <button className="absolute top-3 right-3 p-1 rounded text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              <X size={16} />
            </button>
            <SidebarContent {...sidebarProps} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden border-b px-4 h-12 flex items-center gap-3 bg-background shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-muted-foreground hover:text-foreground">
            <Menu size={20} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Briefcase size={12} className="text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Job Tracker</span>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
        <FeedbackButton />
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/applications" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/interviews" element={<InterviewsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
