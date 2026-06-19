import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink, FolderKanban, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { StatCard } from "./components/StatCard";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  MeetingSummary,
  ProjectSummary,
  RequirementSummary,
  TaskSummary,
} from "./lib/types";
import "./styles.css";

type LoadState = "idle" | "loading" | "ready" | "error";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;

    setLoadState("loading");
    Promise.all([
      supabase
        .from("projects")
        .select("id,name,slug,description,status,google_drive_folder_url,updated_at")
        .order("name"),
      supabase
        .from("tasks")
        .select("id,project_id,title,status,priority,start_date,due_date,blocker_reason")
        .is("archived_at", null)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("meetings")
        .select("id,project_id,title,meeting_date,google_meet_url")
        .order("meeting_date", { ascending: false })
        .limit(5),
      supabase
        .from("requirements")
        .select("id,project_id,module,title,status,priority,updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
    ])
      .then(([projectResult, taskResult, meetingResult, requirementResult]) => {
        const firstError =
          projectResult.error ||
          taskResult.error ||
          meetingResult.error ||
          requirementResult.error;

        if (firstError) throw firstError;

        setProjects(projectResult.data ?? []);
        setTasks(taskResult.data ?? []);
        setMeetings(meetingResult.data ?? []);
        setRequirements(requirementResult.data ?? []);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [session]);

  const taskStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inDays = (days: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date;
    };

    return {
      total: tasks.length,
      overdue: tasks.filter((task) => {
        if (!task.due_date || task.status === "done" || task.status === "cancelled") {
          return false;
        }
        return new Date(`${task.due_date}T00:00:00`) < today;
      }).length,
      due7: tasks.filter((task) => {
        if (!task.due_date || task.status === "done" || task.status === "cancelled") {
          return false;
        }
        const due = new Date(`${task.due_date}T00:00:00`);
        return due >= today && due <= inDays(7);
      }).length,
      blocked: tasks.filter((task) => task.status === "blocked").length,
    };
  }, [tasks]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setAuthMessage("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMessage(error ? error.message : "");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProjects([]);
    setTasks([]);
    setMeetings([]);
    setRequirements([]);
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="shell shell--center">
        <section className="auth-panel">
          <h1>Rotary AI Platform</h1>
          <p>Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to connect the app.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="shell shell--center">
        <form className="auth-panel" onSubmit={signIn}>
          <h1>Rotary AI Platform</h1>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit">Sign in</button>
          {authMessage ? <p className="form-message">{authMessage}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">District 3481</p>
          <h1>Rotary AI Platform</h1>
        </div>
        <button className="icon-button" type="button" onClick={signOut} title="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      <section className="stats-grid">
        <StatCard label="Active tasks" value={taskStats.total} />
        <StatCard label="Due in 7 days" value={taskStats.due7} tone="warn" />
        <StatCard label="Overdue" value={taskStats.overdue} tone="danger" />
        <StatCard label="Blocked" value={taskStats.blocked} tone="neutral" />
      </section>

      {loadState === "error" ? (
        <section className="notice">Data could not be loaded. Check Supabase grants, RLS policies, and project membership.</section>
      ) : null}

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <FolderKanban size={18} />
            <h2>Projects</h2>
          </div>
          <div className="list">
            {projects.map((project) => (
              <article className="list-row" key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.status}</span>
                </div>
                {project.google_drive_folder_url ? (
                  <a href={project.google_drive_folder_url} target="_blank" rel="noreferrer" title="Open Drive folder">
                    <ExternalLink size={16} />
                  </a>
                ) : null}
              </article>
            ))}
            {projects.length === 0 && loadState !== "loading" ? <p className="empty">No visible projects.</p> : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <CalendarDays size={18} />
            <h2>Upcoming Work</h2>
          </div>
          <div className="task-table" role="table">
            <div className="task-table__head" role="row">
              <span>Task</span>
              <span>Status</span>
              <span>Due</span>
            </div>
            {tasks.slice(0, 8).map((task) => (
              <div className="task-table__row" role="row" key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.status}</span>
                <span>{task.due_date ?? "No date"}</span>
              </div>
            ))}
            {tasks.length === 0 && loadState !== "loading" ? <p className="empty">No active tasks.</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>Recent Meetings</h2>
          <div className="list">
            {meetings.map((meeting) => (
              <article className="list-row" key={meeting.id}>
                <div>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.meeting_date}</span>
                </div>
                {meeting.google_meet_url ? (
                  <a href={meeting.google_meet_url} target="_blank" rel="noreferrer" title="Open Meet">
                    <ExternalLink size={16} />
                  </a>
                ) : null}
              </article>
            ))}
            {meetings.length === 0 && loadState !== "loading" ? <p className="empty">No meeting records.</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>Updated Requirements</h2>
          <div className="list">
            {requirements.map((requirement) => (
              <article className="list-row" key={requirement.id}>
                <div>
                  <strong>{requirement.title}</strong>
                  <span>{requirement.module} · {requirement.status}</span>
                </div>
              </article>
            ))}
            {requirements.length === 0 && loadState !== "loading" ? <p className="empty">No requirements yet.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
