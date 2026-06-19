import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, ExternalLink, FolderKanban, LogOut, Pencil, Plus, Save, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { StatCard } from "./components/StatCard";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  ActionItemSummary,
  MeetingDecision,
  MeetingDetail,
  MeetingSummary,
  ProjectSummary,
  RequirementSummary,
  TaskSummary,
} from "./lib/types";
import "./styles.css";

type LoadState = "idle" | "loading" | "ready" | "error";
type EditKind = "project" | "task" | "meeting" | "actionItem" | "requirement";
type GanttScale = "week" | "month";
type EditingState = {
  kind: EditKind;
  id: string;
  values: Record<string, string>;
};
type NewProjectState = {
  name: string;
  slug: string;
  description: string;
  status: string;
  start_date: string;
  expected_end_date: string;
  google_drive_folder_url: string;
  drive_folder_label: string;
  drive_folder_purpose: string;
};

const APP_NAME = "3481 Rotary AI專案管理平台";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

const taskStatusOptions = Object.entries(taskStatusLabels);
const projectStatusOptions = Object.entries(projectStatusLabels);
const requirementStatusOptions = Object.entries(requirementStatusLabels);
const emptyNewProject: NewProjectState = {
  name: "",
  slug: "",
  description: "",
  status: "active",
  start_date: "",
  expected_end_date: "",
  google_drive_folder_url: "",
  drive_folder_label: "",
  drive_folder_purpose: "",
};

function labelFromMap(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}

function toLocalDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}`;
}

function nullable(value: string) {
  return value.trim() === "" ? null : value;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const [actionItems, setActionItems] = useState<ActionItemSummary[]>([]);
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [ganttScale, setGanttScale] = useState<GanttScale>("week");
  const [meetingDetail, setMeetingDetail] = useState<MeetingDetail | null>(null);
  const [meetingDetailLoading, setMeetingDetailLoading] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState<NewProjectState>(emptyNewProject);

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
        .select("id,name,slug,description,status,start_date,expected_end_date,google_drive_folder_url,drive_folder_label,drive_folder_purpose,updated_at")
        .order("name"),
      supabase
        .from("tasks")
        .select("id,project_id,title,status,priority,start_date,due_date,completed_date,blocker_reason,owner_names,collaborator_names,output_title")
        .is("archived_at", null)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("meetings")
        .select("id,project_id,title,meeting_date,summary,notes,google_meet_url")
        .order("meeting_date", { ascending: false }),
      supabase
        .from("action_items")
        .select("id,project_id,title,description,due_date,status,owner_names,collaborator_names")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(8),
      supabase
        .from("requirements")
        .select("id,project_id,module,title,status,priority,updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
    ])
      .then(([projectResult, taskResult, meetingResult, actionItemResult, requirementResult]) => {
        const firstError =
          projectResult.error ||
          taskResult.error ||
          meetingResult.error ||
          actionItemResult.error ||
          requirementResult.error;

        if (firstError) throw firstError;

        setProjects(projectResult.data ?? []);
        setTasks(taskResult.data ?? []);
        setMeetings(meetingResult.data ?? []);
        setActionItems(actionItemResult.data ?? []);
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

  const projectGantt = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = projects.map((project) => {
      const projectTasks = tasks
        .filter((task) => task.project_id === project.id && task.status !== "cancelled")
        .sort((a, b) => {
          const aTime = toLocalDate(a.due_date ?? a.start_date)?.getTime() ?? 0;
          const bTime = toLocalDate(b.due_date ?? b.start_date)?.getTime() ?? 0;
          return aTime - bTime || a.title.localeCompare(b.title, "zh-Hant");
        });
      const firstTaskDate = projectTasks.reduce<Date | null>((earliest, task) => {
        const date = toLocalDate(task.start_date ?? task.due_date);
        return date && (!earliest || date < earliest) ? date : earliest;
      }, null);
      const lastTask = projectTasks.reduce<TaskSummary | null>((latest, task) => {
        const date = toLocalDate(task.due_date ?? task.start_date);
        const latestDate = latest ? toLocalDate(latest.due_date ?? latest.start_date) : null;
        return date && (!latestDate || date > latestDate) ? task : latest;
      }, null);
      const lastTaskDate = lastTask ? toLocalDate(lastTask.due_date ?? lastTask.start_date) : null;
      const start = toLocalDate(project.start_date) ?? firstTaskDate ?? today;
      const end = toLocalDate(project.expected_end_date) ?? lastTaskDate ?? start;
      const safeEnd = end < start ? start : end;
      const doneCount = projectTasks.filter((task) => task.status === "done").length;

      return {
        project,
        start,
        end: safeEnd,
        durationDays: daysBetween(start, safeEnd) + 1,
        taskCount: projectTasks.length,
        doneCount,
        progress: projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0,
        lastTask,
      };
    }).sort((a, b) => {
      const dateOrder = a.start.getTime() - b.start.getTime();
      return dateOrder || a.project.name.localeCompare(b.project.name, "zh-Hant");
    });

    const firstDate = rows.reduce<Date | null>(
      (earliest, row) => (!earliest || row.start < earliest ? row.start : earliest),
      null,
    );
    const lastDate = rows.reduce<Date | null>(
      (latest, row) => (!latest || row.end > latest ? row.end : latest),
      null,
    );
    const rangeStart = new Date(firstDate ?? today);
    rangeStart.setDate(rangeStart.getDate() - (ganttScale === "week" ? 7 : 14));
    const rangeEnd = new Date(lastDate ?? today);
    rangeEnd.setDate(rangeEnd.getDate() + (ganttScale === "week" ? 7 : 30));
    const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);
    const stepDays = ganttScale === "week" ? 7 : 30;
    const tickCount = Math.floor(totalDays / stepDays) + 1;
    const ticks = Array.from({ length: tickCount + 1 }, (_value, index) => {
      const offset = Math.min(stepDays * index, totalDays);
      const date = new Date(rangeStart);
      date.setDate(date.getDate() + offset);
      return {
        label: ganttScale === "week" ? formatMonthDay(date) : formatYearMonth(date),
        left: `${(offset / totalDays) * 100}%`,
      };
    });

    return { rows, rangeStart, totalDays, ticks };
  }, [ganttScale, projects, tasks]);

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
    setActionItems([]);
    setRequirements([]);
  }

  async function openMeetingDetail(meeting: MeetingSummary) {
    if (!supabase) return;
    if (meetingDetail?.meeting.id === meeting.id) {
      setMeetingDetail(null);
      return;
    }
    setMeetingDetailLoading(true);
    const [decisionsResult, actionItemsResult] = await Promise.all([
      supabase
        .from("meeting_decisions")
        .select("id,meeting_id,decision,created_at")
        .eq("meeting_id", meeting.id)
        .order("created_at"),
      supabase
        .from("action_items")
        .select("id,project_id,title,description,due_date,status,owner_names,collaborator_names")
        .eq("meeting_id", meeting.id)
        .order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    setMeetingDetailLoading(false);
    setMeetingDetail({
      meeting,
      decisions: (decisionsResult.data ?? []) as MeetingDecision[],
      actionItems: (actionItemsResult.data ?? []) as ActionItemSummary[],
    });
  }

  function startEdit(kind: EditKind, item: { id: string } & object) {
    const values = Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, value == null ? "" : String(value)]),
    );
    setSaveMessage("");
    setEditing({ kind, id: String(item.id), values });
  }

  function cancelEdit() {
    setEditing(null);
    setSaveMessage("");
  }

  function setEditValue(field: string, value: string) {
    setEditing((current) =>
      current ? { ...current, values: { ...current.values, [field]: value } } : current,
    );
  }

  function setNewProjectValue(field: keyof NewProjectState, value: string) {
    setNewProject((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !current.slug ? { slug: slugify(value) } : {}),
    }));
  }

  function startAddProject() {
    setSaveMessage("");
    setEditing(null);
    setNewProject(emptyNewProject);
    setIsAddingProject(true);
  }

  function cancelAddProject() {
    setSaveMessage("");
    setNewProject(emptyNewProject);
    setIsAddingProject(false);
  }

  async function addProject() {
    if (!supabase) return;

    const name = newProject.name.trim();
    const slug = slugify(newProject.slug || newProject.name);

    if (!name || !slug) {
      setSaveMessage("新增失敗，請填寫專案名稱與英文代碼。");
      return;
    }

    setSaveMessage("新增專案中...");
    const payload = {
      name,
      slug,
      description: nullable(newProject.description),
      status: newProject.status,
      start_date: nullable(newProject.start_date),
      expected_end_date: nullable(newProject.expected_end_date),
      google_drive_folder_url: nullable(newProject.google_drive_folder_url),
      drive_folder_label: nullable(newProject.drive_folder_label),
      drive_folder_purpose: nullable(newProject.drive_folder_purpose),
    };
    const { data, error } = await supabase
      .from("projects")
      .insert(payload)
      .select("id,name,slug,description,status,start_date,expected_end_date,google_drive_folder_url,drive_folder_label,drive_folder_purpose,updated_at")
      .single();

    if (error) {
      console.error(error);
      setSaveMessage("新增失敗，請確認你有新增專案權限，且英文代碼沒有重複。");
      return;
    }

    setProjects((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")));
    setNewProject(emptyNewProject);
    setIsAddingProject(false);
    setSaveMessage("已新增專案。");
  }

  async function saveEdit() {
    if (!supabase || !editing) return;

    setSaveMessage("儲存中...");
    const { kind, id, values } = editing;
    const tableByKind: Record<EditKind, string> = {
      project: "projects",
      task: "tasks",
      meeting: "meetings",
      actionItem: "action_items",
      requirement: "requirements",
    };
    const payloadByKind: Record<EditKind, Record<string, string | null>> = {
      project: {
        name: nullable(values.name),
        description: nullable(values.description),
        status: values.status,
        start_date: nullable(values.start_date),
        expected_end_date: nullable(values.expected_end_date),
        google_drive_folder_url: nullable(values.google_drive_folder_url),
        drive_folder_label: nullable(values.drive_folder_label),
        drive_folder_purpose: nullable(values.drive_folder_purpose),
      },
      task: {
        title: nullable(values.title),
        status: values.status,
        priority: values.priority,
        start_date: nullable(values.start_date),
        due_date: nullable(values.due_date),
        completed_date: nullable(values.completed_date),
        owner_names: nullable(values.owner_names),
        collaborator_names: nullable(values.collaborator_names),
        output_title: nullable(values.output_title),
        blocker_reason: values.status === "blocked" ? nullable(values.blocker_reason) : null,
      },
      meeting: {
        title: nullable(values.title),
        meeting_date: nullable(values.meeting_date),
        summary: nullable(values.summary),
        notes: nullable(values.notes),
        google_meet_url: nullable(values.google_meet_url),
      },
      actionItem: {
        title: nullable(values.title),
        description: nullable(values.description),
        due_date: nullable(values.due_date),
        status: values.status,
        owner_names: nullable(values.owner_names),
        collaborator_names: nullable(values.collaborator_names),
      },
      requirement: {
        module: nullable(values.module),
        title: nullable(values.title),
        status: values.status,
        priority: values.priority,
      },
    };

    const { error } = await supabase.from(tableByKind[kind]).update(payloadByKind[kind]).eq("id", id);

    if (error) {
      console.error(error);
      setSaveMessage("儲存失敗，請確認你有編輯權限。");
      return;
    }

    const updateList = <T extends { id: string }>(items: T[]) =>
      items.map((item) => (item.id === id ? ({ ...item, ...payloadByKind[kind] } as T) : item));

    if (kind === "project") setProjects(updateList);
    if (kind === "task") setTasks(updateList);
    if (kind === "meeting") setMeetings(updateList);
    if (kind === "actionItem") setActionItems(updateList);
    if (kind === "requirement") setRequirements(updateList);

    setEditing(null);
    setSaveMessage("已更新。");
  }

  function isEditing(kind: EditKind, id: string) {
    return editing?.kind === kind && editing.id === id;
  }

  function editActions(kind: EditKind, item: { id: string } & object) {
    const active = isEditing(kind, String(item.id));

    return active ? (
      <div className="row-actions">
        <button className="icon-button" type="button" onClick={saveEdit} title="儲存" aria-label="儲存">
          <Save size={16} />
        </button>
        <button className="icon-button" type="button" onClick={cancelEdit} title="取消" aria-label="取消">
          <X size={16} />
        </button>
      </div>
    ) : (
      <button className="icon-button" type="button" onClick={() => startEdit(kind, item)} title="編輯" aria-label="編輯">
        <Pencil size={16} />
      </button>
    );
  }

  function editInput(field: string, label: string, type = "text") {
    return (
      <label>
        {label}
        <input type={type} value={editing?.values[field] ?? ""} onChange={(event) => setEditValue(field, event.target.value)} />
      </label>
    );
  }

  function editTextarea(field: string, label: string) {
    return (
      <label>
        {label}
        <textarea value={editing?.values[field] ?? ""} onChange={(event) => setEditValue(field, event.target.value)} />
      </label>
    );
  }

  function editSelect(field: string, label: string, options: Array<[string, string]>) {
    return (
      <label>
        {label}
        <select value={editing?.values[field] ?? ""} onChange={(event) => setEditValue(field, event.target.value)}>
          {options.map(([value, labelText]) => (
            <option value={value} key={value}>
              {labelText}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function newProjectInput(field: keyof NewProjectState, label: string, type = "text") {
    return (
      <label>
        {label}
        <input type={type} value={newProject[field]} onChange={(event) => setNewProjectValue(field, event.target.value)} />
      </label>
    );
  }

  function newProjectTextarea(field: keyof NewProjectState, label: string) {
    return (
      <label>
        {label}
        <textarea value={newProject[field]} onChange={(event) => setNewProjectValue(field, event.target.value)} />
      </label>
    );
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
      {saveMessage ? <section className="notice">{saveMessage}</section> : null}

      <section className="content-grid">
        <div className="panel panel--wide">
          <div className="panel-heading">
            <CalendarDays size={18} />
            <h2>專案甘特圖</h2>
            <div className="segmented-control" aria-label="甘特圖時間刻度">
              <button className={ganttScale === "week" ? "is-active" : ""} type="button" onClick={() => setGanttScale("week")}>
                週
              </button>
              <button className={ganttScale === "month" ? "is-active" : ""} type="button" onClick={() => setGanttScale("month")}>
                月
              </button>
            </div>
          </div>
          {projectGantt.rows.length > 0 ? (
            <div className="gantt-scroll" role="region" aria-label="專案甘特圖">
              <div className="gantt-chart">
                <div className="gantt-axis" aria-hidden="true">
                  <span>專案 / 起訖時間</span>
                  <div className="gantt-timeline">
                    {projectGantt.ticks.map((tick) => (
                      <span className="gantt-tick" style={{ left: tick.left }} key={`${tick.label}-${tick.left}`}>
                        {tick.label}
                      </span>
                    ))}
                  </div>
                </div>
                {projectGantt.rows.map((row) => {
                  const offset = daysBetween(projectGantt.rangeStart, row.start);
                  const left = `${(offset / projectGantt.totalDays) * 100}%`;
                  const width = `${Math.max((row.durationDays / projectGantt.totalDays) * 100, 4)}%`;
                  const startText = row.project.start_date ?? formatMonthDay(row.start);
                  const endText = row.project.expected_end_date ?? formatMonthDay(row.end);
                  const barText = row.lastTask ? `最後任務：${row.lastTask.title}` : "尚未建立任務";

                  return (
                    <div className="gantt-row" key={row.project.id}>
                      <div className="gantt-project-meta">
                        {isEditing("project", row.project.id) ? (
                          <div className="edit-grid">
                            {editInput("name", "專案")}
                            {editSelect("status", "狀態", projectStatusOptions)}
                            {editInput("start_date", "開始時間", "date")}
                            {editInput("expected_end_date", "期望結束時間", "date")}
                          </div>
                        ) : (
                          <>
                            <strong>{row.project.name}</strong>
                            <span>{startText} - {endText}</span>
                            <span>{row.doneCount}/{row.taskCount} 完成 · {row.progress}%</span>
                          </>
                        )}
                        {editActions("project", row.project)}
                      </div>
                      <div className="gantt-track">
                        <div className="gantt-bar gantt-bar--project" style={{ left, width }} title={barText}>
                          <span>{barText}</span>
                          <i style={{ width: `${row.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : loadState !== "loading" ? (
            <p className="empty">目前沒有可顯示的專案。</p>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <FolderKanban size={18} />
            <h2>專案列表</h2>
            <button className="icon-button panel-action" type="button" onClick={startAddProject} title="新增專案" aria-label="新增專案">
              <Plus size={16} />
            </button>
          </div>
          {isAddingProject ? (
            <div className="add-project-form">
              <div className="edit-grid">
                {newProjectInput("name", "專案名稱")}
                {newProjectInput("slug", "英文代碼")}
                <label>
                  狀態
                  <select value={newProject.status} onChange={(event) => setNewProjectValue("status", event.target.value)}>
                    {projectStatusOptions.map(([value, labelText]) => (
                      <option value={value} key={value}>
                        {labelText}
                      </option>
                    ))}
                  </select>
                </label>
                {newProjectInput("start_date", "開始時間", "date")}
                {newProjectInput("expected_end_date", "期望結束時間", "date")}
                {newProjectTextarea("description", "說明")}
                {newProjectInput("google_drive_folder_url", "Google Drive 連結")}
                {newProjectInput("drive_folder_label", "Drive 資料夾")}
                {newProjectTextarea("drive_folder_purpose", "Drive 用途")}
              </div>
              <div className="form-actions">
                <button type="button" onClick={addProject}>新增</button>
                <button type="button" onClick={cancelAddProject}>取消</button>
              </div>
            </div>
          ) : null}
          <div className="list">
            {projects.map((project) => (
              <article className="list-row" key={project.id}>
                <div>
                  {isEditing("project", project.id) ? (
                    <div className="edit-grid">
                      {editInput("name", "專案名稱")}
                      {editSelect("status", "狀態", projectStatusOptions)}
                      {editInput("start_date", "開始時間", "date")}
                      {editInput("expected_end_date", "期望結束時間", "date")}
                      {editTextarea("description", "說明")}
                      {editInput("google_drive_folder_url", "Google Drive 連結")}
                      {editInput("drive_folder_label", "Drive 資料夾")}
                      {editTextarea("drive_folder_purpose", "Drive 用途")}
                    </div>
                  ) : (
                    <>
                      <strong>{project.name}</strong>
                      <span>{labelFromMap(projectStatusLabels, project.status)}</span>
                      <span>{project.start_date ?? "未設定開始"} - {project.expected_end_date ?? "未設定結束"}</span>
                      {project.description ? <p>{project.description}</p> : null}
                      {project.drive_folder_label ? (
                        <p>{project.drive_folder_label} · {project.drive_folder_purpose}</p>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="row-actions">
                  {project.google_drive_folder_url && !isEditing("project", project.id) ? (
                    <a href={project.google_drive_folder_url} target="_blank" rel="noreferrer" title="開啟雲端硬碟資料夾">
                      <ExternalLink size={16} />
                    </a>
                  ) : null}
                  {editActions("project", project)}
                </div>
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
              <span>負責/期限</span>
            </div>
            {tasks.slice(0, 8).map((task) => (
              <div className="task-table__row" role="row" key={task.id}>
                <div>
                  {isEditing("task", task.id) ? (
                    <div className="edit-grid">
                      {editInput("title", "任務")}
                      {editSelect("status", "狀態", taskStatusOptions)}
                      {editSelect("priority", "優先", [["p0", "P0"], ["p1", "P1"], ["p2", "P2"], ["p3", "P3"]])}
                      {editInput("start_date", "開始日", "date")}
                      {editInput("due_date", "目標完成日", "date")}
                      {editInput("completed_date", "實際完成日", "date")}
                      {editInput("owner_names", "負責人")}
                      {editInput("output_title", "產出物")}
                      {editInput("collaborator_names", "合作/資源")}
                      {editInput("blocker_reason", "受阻原因")}
                    </div>
                  ) : (
                    <>
                      <strong>{task.title}</strong>
                      {task.output_title ? <span>產出：{task.output_title}</span> : null}
                      {task.collaborator_names ? <span>合作：{task.collaborator_names}</span> : null}
                    </>
                  )}
                </div>
                <span>{taskStatusLabels[task.status]}</span>
                <div className="row-tail">
                  <span>{task.owner_names ?? "未指派"} · {task.due_date ?? "未設定"}</span>
                  {editActions("task", task)}
                </div>
              </div>
            ))}
            {tasks.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有進行中的任務。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>最近會議</h2>
          <div className="list">
            {meetings.map((meeting) => (
              <div className="meeting-item" key={meeting.id}>
                <article className="list-row">
                  <div>
                    {isEditing("meeting", meeting.id) ? (
                      <div className="edit-grid">
                        {editInput("title", "會議標題")}
                        {editInput("meeting_date", "日期", "date")}
                        {editTextarea("summary", "摘要")}
                        {editTextarea("notes", "備註")}
                        {editInput("google_meet_url", "Google Meet 連結")}
                      </div>
                    ) : (
                      <>
                        <strong>{meeting.title}</strong>
                        <span>{meeting.meeting_date}</span>
                        {meeting.summary ? <p>{meeting.summary}</p> : null}
                      </>
                    )}
                  </div>
                  <div className="row-actions">
                    {meeting.google_meet_url && !isEditing("meeting", meeting.id) ? (
                      <a href={meeting.google_meet_url} target="_blank" rel="noreferrer" title="開啟 Google Meet">
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => openMeetingDetail(meeting)}
                      title={meetingDetail?.meeting.id === meeting.id ? "收合會議詳情" : "展開會議詳情"}
                      aria-label={meetingDetail?.meeting.id === meeting.id ? "收合會議詳情" : "展開會議詳情"}
                    >
                      {meetingDetail?.meeting.id === meeting.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {editActions("meeting", meeting)}
                  </div>
                </article>
                {meetingDetail?.meeting.id === meeting.id ? (
                  <div className="meeting-detail">
                    {meetingDetailLoading ? (
                      <p className="empty">載入中...</p>
                    ) : (
                      <>
                        {meetingDetail.meeting.notes ? (
                          <section className="meeting-detail-section">
                            <h4>出席與背景</h4>
                            <pre className="meeting-notes">{meetingDetail.meeting.notes}</pre>
                          </section>
                        ) : null}
                        {meetingDetail.meeting.summary ? (
                          <section className="meeting-detail-section">
                            <h4>摘要</h4>
                            <p>{meetingDetail.meeting.summary}</p>
                          </section>
                        ) : null}
                        {meetingDetail.decisions.length > 0 ? (
                          <section className="meeting-detail-section">
                            <h4>會議決議（{meetingDetail.decisions.length} 項）</h4>
                            <ol className="meeting-decisions">
                              {meetingDetail.decisions.map((d, i) => (
                                <li key={d.id}>
                                  <span className="decision-index">{i + 1}</span>
                                  <span>{d.decision}</span>
                                </li>
                              ))}
                            </ol>
                          </section>
                        ) : null}
                        {meetingDetail.actionItems.length > 0 ? (
                          <section className="meeting-detail-section">
                            <h4>執行事項（{meetingDetail.actionItems.length} 項）</h4>
                            <div className="action-items-table">
                              <div className="action-items-table__head">
                                <span>事項</span>
                                <span>負責人</span>
                                <span>期限</span>
                              </div>
                              {meetingDetail.actionItems.map((item) => (
                                <div className="action-items-table__row" key={item.id}>
                                  <span>{item.title}</span>
                                  <span>{item.owner_names ?? "—"}</span>
                                  <span>{item.due_date ?? "—"}</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}
                        {meetingDetail.decisions.length === 0 && meetingDetail.actionItems.length === 0 ? (
                          <p className="empty">此會議尚未記錄決議或執行事項。</p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            {meetings.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有會議紀錄。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>會議待辦</h2>
          <div className="list">
            {actionItems.map((item) => (
              <article className="list-row" key={item.id}>
                <div>
                  {isEditing("actionItem", item.id) ? (
                    <div className="edit-grid">
                      {editInput("title", "待辦")}
                      {editSelect("status", "狀態", taskStatusOptions)}
                      {editInput("due_date", "期限", "date")}
                      {editInput("owner_names", "負責人")}
                      {editInput("collaborator_names", "合作/資源")}
                      {editTextarea("description", "說明")}
                    </div>
                  ) : (
                    <>
                      <strong>{item.title}</strong>
                      <span>{item.owner_names ?? "未指派"} · {item.due_date ?? "未設定期限"}</span>
                      {item.collaborator_names ? <p>合作：{item.collaborator_names}</p> : null}
                    </>
                  )}
                </div>
                {editActions("actionItem", item)}
              </article>
            ))}
            {actionItems.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有會議待辦。</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2>最近更新需求</h2>
          <div className="list">
            {requirements.map((requirement) => (
              <article className="list-row" key={requirement.id}>
                <div>
                  {isEditing("requirement", requirement.id) ? (
                    <div className="edit-grid">
                      {editInput("title", "需求")}
                      {editInput("module", "模組")}
                      {editSelect("status", "狀態", requirementStatusOptions)}
                      {editSelect("priority", "優先", [["p0", "P0"], ["p1", "P1"], ["p2", "P2"], ["p3", "P3"]])}
                    </div>
                  ) : (
                    <>
                      <strong>{requirement.title}</strong>
                      <span>{requirement.module} · {labelFromMap(requirementStatusLabels, requirement.status)}</span>
                    </>
                  )}
                </div>
                {editActions("requirement", requirement)}
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
