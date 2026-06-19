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

const APP_NAME = "3481 Rotary AI專案管理平台";

const taskStatusLabels: Record<TaskSummary["status"], string> = {
  backlog: "待排程",
  todo: "待處理",
  doing: "進行中",
  review: "審核中",
  done: "已完成",
  blocked: "受阻",
  cancelled: "已取消",
};

const projectStatusLabels: Record<string, string> = {
  active: "進行中",
  paused: "暫停",
  completed: "已完成",
  archived: "已封存",
};

const requirementStatusLabels: Record<string, string> = {
  draft: "草稿",
  reviewing: "審核中",
  approved: "已核准",
  in_dev: "開發中",
  testing: "測試中",
  released: "已發布",
  rejected: "已退回",
};

function labelFromMap(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}

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

    setAuthMessage("登入中...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMessage(error ? "登入失敗，請確認電子郵件與密碼。" : "");
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
          <h1>{APP_NAME}</h1>
          <p>請設定 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_PUBLISHABLE_KEY` 以連線到系統。</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="shell shell--center">
        <form className="auth-panel" onSubmit={signIn}>
          <h1>{APP_NAME}</h1>
          <label>
            電子郵件
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit">登入</button>
          {authMessage ? <p className="form-message">{authMessage}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">國際扶輪 3481 地區</p>
          <h1>{APP_NAME}</h1>
        </div>
        <button className="icon-button" type="button" onClick={signOut} title="登出" aria-label="登出">
          <LogOut size={18} />
        </button>
      </header>

      <section className="stats-grid">
        <StatCard label="進行中任務" value={taskStats.total} />
        <StatCard label="七天內到期" value={taskStats.due7} tone="warn" />
        <StatCard label="已逾期" value={taskStats.overdue} tone="danger" />
        <StatCard label="受阻任務" value={taskStats.blocked} tone="neutral" />
      </section>

      {loadState === "error" ? (
        <section className="notice">資料無法載入，請確認 Supabase 權限、RLS 政策與專案成員設定。</section>
      ) : null}

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <FolderKanban size={18} />
            <h2>專案列表</h2>
          </div>
          <div className="list">
            {projects.map((project) => (
              <article className="list-row" key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <span>{labelFromMap(projectStatusLabels, project.status)}</span>
                </div>
                {project.google_drive_folder_url ? (
                  <a href={project.google_drive_folder_url} target="_blank" rel="noreferrer" title="開啟雲端硬碟資料夾">
                    <ExternalLink size={16} />
                  </a>
                ) : null}
              </article>
            ))}
            {projects.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有可查看的專案。</p> : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <CalendarDays size={18} />
            <h2>近期工作</h2>
          </div>
          <div className="task-table" role="table">
            <div className="task-table__head" role="row">
              <span>任務</span>
              <span>狀態</span>
              <span>期限</span>
            </div>
            {tasks.slice(0, 8).map((task) => (
              <div className="task-table__row" role="row" key={task.id}>
                <strong>{task.title}</strong>
                <span>{taskStatusLabels[task.status]}</span>
                <span>{task.due_date ?? "未設定"}</span>
              </div>
            ))}
            {tasks.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有進行中的任務。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>最近會議</h2>
          <div className="list">
            {meetings.map((meeting) => (
              <article className="list-row" key={meeting.id}>
                <div>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.meeting_date}</span>
                </div>
                {meeting.google_meet_url ? (
                  <a href={meeting.google_meet_url} target="_blank" rel="noreferrer" title="開啟 Google Meet">
                    <ExternalLink size={16} />
                  </a>
                ) : null}
              </article>
            ))}
            {meetings.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有會議紀錄。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>最近更新需求</h2>
          <div className="list">
            {requirements.map((requirement) => (
              <article className="list-row" key={requirement.id}>
                <div>
                  <strong>{requirement.title}</strong>
                  <span>{requirement.module} · {labelFromMap(requirementStatusLabels, requirement.status)}</span>
                </div>
              </article>
            ))}
            {requirements.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有需求紀錄。</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
