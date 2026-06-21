import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileDown, FolderKanban, HardDrive, LogOut, Megaphone, Pencil, Plus, RefreshCw, Save, Upload, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { StatCard } from "./components/StatCard";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  AnnouncementSummary,
  CalendarEventSummary,
  MeetingDetail,
  MeetingSummary,
  ProjectSummary,
  TaskSummary,
} from "./lib/types";
import "./styles.css";

type LoadState = "idle" | "loading" | "ready" | "error";
type EditKind = "project" | "task" | "meeting";
type GanttScale = "week" | "month";
type CalendarEventKind = "project" | "task" | "meeting" | "custom";
type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  label: string;
  kind: CalendarEventKind;
  projectId?: string;
  meetingId?: string;
  calendarEventId?: string;
};
type EditingState = {
  kind: EditKind;
  id: string;
  values: Record<string, string>;
};
type NewProjectState = {
  name: string;
  slug: string;
  project_purpose: string;
  project_background: string;
  status: string;
  owner_names: string;
  participating_units: string;
  start_date: string;
  expected_end_date: string;
  budget_range: string;
  google_drive_folder_url: string;
  drive_folder_label: string;
  drive_folder_purpose: string;
};
type NewTaskState = {
  title: string;
  status: TaskSummary["status"];
  priority: TaskSummary["priority"];
  start_date: string;
  due_date: string;
  completed_date: string;
  owner_names: string;
  collaborator_names: string;
  output_title: string;
  blocker_reason: string;
};
type NewCalendarEventState = {
  title: string;
  event_date: string;
  project_id: string;
  location: string;
  url: string;
  description: string;
};
type NewMeetingDecisionRow = {
  topic: string;
  owner: string;
  collaborators: string;
  schedule: string;
  notes: string;
};
type NewMeetingTodoRow = {
  owner: string;
  task: string;
  due: string;
};
type NewMeetingRecordState = {
  title: string;
  meeting_date: string;
  meeting_method: string;
  host: string;
  attendees: string;
  pending_attendees: string;
  google_meet_url: string;
  notes_doc_url: string;
  decisions: NewMeetingDecisionRow[];
  todos: NewMeetingTodoRow[];
  next_meeting_date: string;
  next_meeting_method: string;
  next_meeting_topics: string;
  next_meeting_invitees: string;
};

const MEMBERS = ["Candice", "PT", "Vivian", "Kent", "Jake", "Eric", "CP AI", "Jim", "Wesley"];

const APP_NAME = "3481 Rotary AI專案管理平台";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DRIVE_FOLDER_ID = "1fybSLObkJjwR4znh53tHQDEGHO5025XI";
const DRIVE_FOLDER_URL = `https://drive.google.com/drive/u/3/folders/${DRIVE_FOLDER_ID}`;
const DRIVE_FOLDER_EMBED_URL = `https://drive.google.com/embeddedfolderview?id=${DRIVE_FOLDER_ID}#list`;
const MEETING_RECORDS_FOLDER_ID = "1OkTZTlSUnCUes-Jf_0-RZvYIDqvBlG1I";
const MEETING_RECORDS_FOLDER_URL = `https://drive.google.com/drive/u/3/folders/${MEETING_RECORDS_FOLDER_ID}`;
const MEETING_RECORDS_FOLDER_EMBED_URL = `https://drive.google.com/embeddedfolderview?id=${MEETING_RECORDS_FOLDER_ID}#list`;
const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
const FORMATTED_MEETING_NOTES_PREFIX = "<!-- rotary-meeting-html-v1 -->";
const STRUCTURED_MEETING_RECORD_PREFIX = "<!-- rotary-structured-meeting-v1 -->";
const rotaryMonthlyThemes: Record<number, { zh: string; en: string }> = {
  0: { zh: "職業服務月", en: "Vocational Service" },
  1: { zh: "和平建立與衝突預防月", en: "Peacebuilding and Conflict Prevention" },
  2: { zh: "水資源、衛生與清潔月", en: "Water, Sanitation, and Hygiene" },
  3: { zh: "環境月", en: "Environment" },
  4: { zh: "青少年服務月", en: "Youth Service" },
  5: { zh: "扶輪聯誼月", en: "Rotary Fellowships" },
  6: { zh: "母子健康月", en: "Maternal and Child Health" },
  7: { zh: "社員發展與新社成立月", en: "Membership and New Club Development" },
  8: { zh: "基本教育與識字月", en: "Basic Education and Literacy" },
  9: { zh: "社區經濟發展月", en: "Community Economic Development" },
  10: { zh: "扶輪基金月", en: "Rotary Foundation" },
  11: { zh: "疾病預防與治療月", en: "Disease Prevention and Treatment" },
};

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

const projectStatusOptions = Object.entries(projectStatusLabels);
const taskStatusOptions = Object.entries(taskStatusLabels);
const priorityLabels: Record<TaskSummary["priority"], string> = {
  p0: "最高",
  p1: "高",
  p2: "一般",
  p3: "低",
};
const priorityOptions = Object.entries(priorityLabels);
const emptyNewProject: NewProjectState = {
  name: "",
  slug: "",
  project_purpose: "",
  project_background: "",
  status: "active",
  owner_names: "",
  participating_units: "",
  start_date: "",
  expected_end_date: "",
  budget_range: "",
  google_drive_folder_url: "",
  drive_folder_label: "",
  drive_folder_purpose: "",
};
const emptyNewTask: NewTaskState = {
  title: "",
  status: "todo",
  priority: "p2",
  start_date: "",
  due_date: "",
  completed_date: "",
  owner_names: "",
  collaborator_names: "",
  output_title: "",
  blocker_reason: "",
};
const emptyNewCalendarEvent: NewCalendarEventState = {
  title: "",
  event_date: "",
  project_id: "",
  location: "",
  url: "",
  description: "",
};
const emptyMeetingDecision: NewMeetingDecisionRow = {
  topic: "",
  owner: "",
  collaborators: "",
  schedule: "",
  notes: "",
};
const emptyMeetingTodo: NewMeetingTodoRow = {
  owner: "",
  task: "",
  due: "",
};
const emptyNewMeetingRecord: NewMeetingRecordState = {
  title: "",
  meeting_date: "",
  meeting_method: "線上會議",
  host: "",
  attendees: "",
  pending_attendees: "",
  google_meet_url: "",
  notes_doc_url: "",
  decisions: [{ ...emptyMeetingDecision }],
  todos: [{ ...emptyMeetingTodo }],
  next_meeting_date: "",
  next_meeting_method: "",
  next_meeting_topics: "",
  next_meeting_invitees: "",
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

function formatDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getFormattedMeetingHtml(notes: string | null) {
  if (!notes?.startsWith(FORMATTED_MEETING_NOTES_PREFIX)) return null;
  return notes.slice(FORMATTED_MEETING_NOTES_PREFIX.length).trim();
}

function getEditableMeetingNotes(notes: string | null) {
  if (!notes) return "";
  return notes
    .replace(FORMATTED_MEETING_NOTES_PREFIX, "")
    .replace(STRUCTURED_MEETING_RECORD_PREFIX, "")
    .trim();
}

function parseMeetingRecordHtml(notes: string | null): NewMeetingRecordState {
  const base = { ...emptyNewMeetingRecord, decisions: [{ ...emptyMeetingDecision }], todos: [{ ...emptyMeetingTodo }] };
  if (!notes) return base;
  const html = notes
    .replace(FORMATTED_MEETING_NOTES_PREFIX, "")
    .replace(STRUCTURED_MEETING_RECORD_PREFIX, "")
    .trim();
  if (!html) return base;

  const doc = new DOMParser().parseFromString(html, "text/html");

  function tableValue(container: Element | Document, label: string) {
    const rows = container.querySelectorAll("tr");
    for (const row of rows) {
      const th = row.querySelector("th");
      if (th && th.textContent?.trim() === label) {
        return row.querySelector("td")?.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() ?? "";
      }
    }
    return "";
  }

  const h2s = doc.querySelectorAll("h2");
  let section1: Element | null = null;
  let section2: Element | null = null;
  let section3: Element | null = null;
  let section4: Element | null = null;

  for (const h2 of h2s) {
    const text = h2.textContent ?? "";
    if (text.includes("一、")) section1 = h2;
    else if (text.includes("二、")) section2 = h2;
    else if (text.includes("三、")) section3 = h2;
    else if (text.includes("四、")) section4 = h2;
  }

  function siblingTable(heading: Element | null) {
    if (!heading) return null;
    let el = heading.nextElementSibling;
    while (el && el.tagName !== "TABLE" && el.tagName !== "H2") el = el.nextElementSibling;
    return el?.tagName === "TABLE" ? el : null;
  }

  const t1 = siblingTable(section1);
  const title = t1 ? tableValue(t1, "會議名稱") : (doc.querySelector("h1")?.textContent?.trim() ?? "");
  const meeting_date = t1 ? tableValue(t1, "會議時間") : "";
  const meeting_method = t1 ? tableValue(t1, "會議方式") : "";
  const host = t1 ? tableValue(t1, "主持人") : "";
  const attendees = t1 ? tableValue(t1, "與會人員") : "";
  const pending_attendees = t1 ? tableValue(t1, "待確認出席") : "";

  const decisions: NewMeetingDecisionRow[] = [];
  if (section2) {
    let el = section2.nextElementSibling;
    while (el && el.tagName !== "H2") {
      if (el.tagName === "H3") {
        const topicRaw = el.textContent ?? "";
        const topic = topicRaw.replace(/^決議\d+｜/, "").replace(/^決議\d+\|/, "").trim();
        const table = el.nextElementSibling?.tagName === "TABLE" ? el.nextElementSibling : null;
        decisions.push({
          topic,
          owner: table ? tableValue(table, "指定負責人") : "",
          collaborators: table ? tableValue(table, "合作對象") : "",
          schedule: table ? tableValue(table, "時間／進度") : "",
          notes: table ? tableValue(table, "內容") : "",
        });
      }
      el = el.nextElementSibling;
    }
  }

  const todos: NewMeetingTodoRow[] = [];
  if (section3) {
    let el = section3.nextElementSibling;
    while (el && el.tagName !== "H2") {
      if (el.tagName === "TABLE") {
        const bodyRows = el.querySelectorAll("tbody tr");
        for (const row of bodyRows) {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            todos.push({
              owner: cells[0]?.textContent?.trim() ?? "",
              task: cells[1]?.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() ?? "",
              due: cells[2]?.textContent?.trim() ?? "",
            });
          }
        }
      }
      el = el.nextElementSibling;
    }
  }

  const t4 = siblingTable(section4);
  const next_meeting_date = t4 ? tableValue(t4, "時間") : "";
  const next_meeting_method = t4 ? tableValue(t4, "方式") : "";
  const next_meeting_topics = t4 ? tableValue(t4, "主要議題") : "";
  const next_meeting_invitees = t4 ? tableValue(t4, "需邀請人員") : "";

  return {
    title,
    meeting_date,
    meeting_method,
    host,
    attendees,
    pending_attendees,
    google_meet_url: "",
    notes_doc_url: "",
    decisions: decisions.length > 0 ? decisions : [{ ...emptyMeetingDecision }],
    todos: todos.length > 0 ? todos : [{ ...emptyMeetingTodo }],
    next_meeting_date,
    next_meeting_method,
    next_meeting_topics,
    next_meeting_invitees,
  };
}

function normalizeMeetingNotesForSave(value: string | null | undefined, originalNotes: string | null | undefined) {
  const content = value?.trim();
  if (!content) return null;
  const formatted = originalNotes?.startsWith(FORMATTED_MEETING_NOTES_PREFIX) || /<\/?[a-z][\s\S]*>/i.test(content);
  if (!formatted) return content;

  const structured = originalNotes?.includes(STRUCTURED_MEETING_RECORD_PREFIX);
  const body = content
    .replace(FORMATTED_MEETING_NOTES_PREFIX, "")
    .replace(STRUCTURED_MEETING_RECORD_PREFIX, "")
    .trim();
  return `${FORMATTED_MEETING_NOTES_PREFIX}\n${structured ? `${STRUCTURED_MEETING_RECORD_PREFIX}\n` : ""}${body}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableRows(rows: Array<[string, string]>) {
  return rows
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");
}

function buildMeetingRecordHtml(record: NewMeetingRecordState) {
  const title = record.title.trim() || "AI 委員會會議紀錄";
  const meetingInfoRows = tableRows([
    ["會議名稱", record.title],
    ["會議時間", record.meeting_date],
    ["會議方式", record.meeting_method],
    ["主持人", record.host],
    ["與會人員", record.attendees],
    ["待確認出席", record.pending_attendees],
  ]);
  const decisionSections = record.decisions
    .filter((decision) => Object.values(decision).some((value) => value.trim()))
    .map((decision, index) => {
      const rows = tableRows([
        ["指定負責人", decision.owner],
        ["合作對象", decision.collaborators],
        ["時間／進度", decision.schedule],
        ["內容", decision.notes],
      ]);
      return `<h3>決議${index + 1}｜${escapeHtml(decision.topic || "未命名事項")}</h3><table><tbody>${rows}</tbody></table>`;
    })
    .join("");
  const todoRows = record.todos
    .filter((todo) => Object.values(todo).some((value) => value.trim()))
    .map((todo) =>
      `<tr><td>${escapeHtml(todo.owner)}</td><td>${escapeHtml(todo.task).replace(/\n/g, "<br>")}</td><td>${escapeHtml(todo.due)}</td></tr>`,
    )
    .join("");
  const nextMeetingRows = tableRows([
    ["時間", record.next_meeting_date],
    ["方式", record.next_meeting_method],
    ["主要議題", record.next_meeting_topics],
    ["需邀請人員", record.next_meeting_invitees],
  ]);

  return [
    `<h1>${escapeHtml(title)}</h1>`,
    meetingInfoRows ? `<h2>一、會議資訊</h2><table><tbody>${meetingInfoRows}</tbody></table>` : "",
    decisionSections ? `<h2>二、會議決議</h2>${decisionSections}` : "",
    todoRows ? `<h2>三、待辦事項 To Do</h2><table><thead><tr><th>負責人</th><th>待辦事項</th><th>期限</th></tr></thead><tbody>${todoRows}</tbody></table>` : "",
    nextMeetingRows ? `<h2>四、下次會議</h2><table><tbody>${nextMeetingRows}</tbody></table>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function nullable(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function updateSupabaseRow<T>(
  table: string,
  id: string,
  payload: Record<string, string | null>,
  select: string,
) {
  if (!supabase) {
    throw new Error("Supabase 尚未設定。");
  }

  const timeout = new Promise<never>((_resolve, reject) => {
    window.setTimeout(() => reject(new Error("更新逾時，請稍後再試。")), 15000);
  });
  const update = supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select(select)
    .maybeSingle();

  const { data, error } = await Promise.race([update, timeout]);
  if (error) throw error;
  if (!data) {
    throw new Error("沒有更新到任何資料，請確認你是專案負責人或管理員。");
  }

  return data as T;
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
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventSummary[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [ganttScale, setGanttScale] = useState<GanttScale>("week");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [meetingDetail, setMeetingDetail] = useState<MeetingDetail | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState<NewProjectState>(emptyNewProject);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskState>(emptyNewTask);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [kpiModal, setKpiModal] = useState<"total" | "due7" | "overdue" | "blocked" | null>(null);
  const [isAddingMeetingRecord, setIsAddingMeetingRecord] = useState(false);
  const [newMeetingRecord, setNewMeetingRecord] = useState<NewMeetingRecordState>(emptyNewMeetingRecord);
  const [editingMeetingRecord, setEditingMeetingRecord] = useState<(NewMeetingRecordState & { id: string; google_meet_url: string; notes_doc_url: string }) | null>(null);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "" });
  const [isAddingCalendarEvent, setIsAddingCalendarEvent] = useState(false);
  const [newCalendarEvent, setNewCalendarEvent] = useState<NewCalendarEventState>(emptyNewCalendarEvent);
  const [importingMeetingId, setImportingMeetingId] = useState<string | null>(null);
  const [driveRefreshKey, setDriveRefreshKey] = useState(0);
  const [driveSyncedAt, setDriveSyncedAt] = useState(() => new Date());
  const meetingFormRef = useRef<HTMLDivElement | null>(null);

  const loadDashboardData = useCallback(async (showLoading = true) => {
    if (!supabase) return;

    if (showLoading) setLoadState("loading");
    try {
      const [projectResult, taskResult, meetingResult, announcementResult, calendarEventResult] = await Promise.all([
        supabase
          .from("projects")
          .select("id,name,slug,description,status,owner_names,project_purpose,project_background,participating_units,start_date,expected_end_date,budget_range,google_drive_folder_url,drive_folder_label,drive_folder_purpose,updated_at")
          .order("name"),
        supabase
          .from("tasks")
          .select("id,project_id,title,status,priority,start_date,due_date,completed_date,blocker_reason,owner_names,collaborator_names,output_title")
          .is("archived_at", null)
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("meetings")
          .select("id,project_id,title,meeting_date,summary,notes,google_meet_url,notes_doc_url")
          .order("meeting_date", { ascending: false }),
        supabase
          .from("announcements")
          .select("id,title,body,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("calendar_events")
          .select("id,project_id,title,event_date,description,location,url,created_at")
          .order("event_date", { ascending: true }),
      ]);

      const firstError =
        projectResult.error ||
        taskResult.error ||
        meetingResult.error;

      if (firstError) throw firstError;
      if (announcementResult.error) {
        console.warn("Announcements unavailable:", announcementResult.error);
      }
      if (calendarEventResult.error) {
        console.warn("Calendar events unavailable:", calendarEventResult.error);
      }

      setProjects(projectResult.data ?? []);
      setTasks(taskResult.data ?? []);
      setMeetings(meetingResult.data ?? []);
      setAnnouncements(announcementResult.error ? [] : announcementResult.data ?? []);
      setCalendarEvents(calendarEventResult.error ? [] : calendarEventResult.data ?? []);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }, []);

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

    void loadDashboardData();
  }, [loadDashboardData, session]);

  useEffect(() => {
    if (!isAddingMeetingRecord) return;
    window.setTimeout(() => {
      meetingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [isAddingMeetingRecord]);

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

  const calendarData = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

    const rawEvents: CalendarEvent[] = [
      ...projects.flatMap((project) => {
        const events: CalendarEvent[] = [];
        if (project.start_date) {
          events.push({
            id: `project-start-${project.id}`,
            date: project.start_date,
            title: project.name,
            label: "專案開始",
            kind: "project",
            projectId: project.id,
          });
        }
        if (project.expected_end_date) {
          events.push({
            id: `project-end-${project.id}`,
            date: project.expected_end_date,
            title: project.name,
            label: "期望結束",
            kind: "project",
            projectId: project.id,
          });
        }
        return events;
      }),
      ...tasks
        .filter((task) => task.due_date && task.status !== "cancelled")
        .map((task) => ({
          id: `task-${task.id}`,
          date: task.due_date as string,
          title: task.title,
          label: taskStatusLabels[task.status],
          kind: "task" as const,
          projectId: task.project_id,
        })),
      ...calendarEvents.map((event) => ({
        id: `calendar-${event.id}`,
        date: event.event_date,
        title: event.title,
        label: event.location ? `行事曆 · ${event.location}` : "行事曆",
        kind: "custom" as const,
        projectId: event.project_id ?? undefined,
        calendarEventId: event.id,
      })),
    ];

    const events = rawEvents
      .filter((event) => {
        const date = toLocalDate(event.date);
        return date && date >= gridStart && date <= gridEnd;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "zh-Hant"));

    const cells = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      const dateKey = formatDateKey(cursor);
      cells.push({
        date: new Date(cursor),
        dateKey,
        isCurrentMonth: cursor.getMonth() === calendarMonth.getMonth(),
        events: events.filter((event) => event.date === dateKey),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const monthEvents = events.filter((event) => {
      const date = toLocalDate(event.date);
      return date && date >= monthStart && date <= monthEnd;
    });

    return {
      title: `${calendarMonth.getFullYear()} 年 ${calendarMonth.getMonth() + 1} 月`,
      theme: rotaryMonthlyThemes[calendarMonth.getMonth()],
      cells,
      monthEvents,
    };
  }, [calendarEvents, calendarMonth, projects, tasks]);

  function shiftCalendarMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openCalendarEvent(event: CalendarEvent) {
    if (event.projectId) {
      setSelectedProjectId(event.projectId);
    }
  }

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
    setAnnouncements([]);
    setCalendarEvents([]);
    setSelectedProjectId(null);
    setSelectedMeetingId(null);
  }

  async function deleteMeeting(id: string) {
    if (!supabase) return;
    if (!window.confirm("確定要刪除此會議記錄？此操作無法復原。")) return;
    const { data, error } = await supabase.from("meetings").delete().eq("id", id).select("id").maybeSingle();
    if (error) {
      console.error(error);
      setSaveMessage("刪除失敗，請確認你有此會議記錄的刪除權限。");
      return;
    }
    if (!data) {
      setSaveMessage("刪除失敗，資料庫沒有刪除任何會議記錄。");
      return;
    }
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (meetingDetail?.meeting.id === id) setMeetingDetail(null);
    if (selectedMeetingId === id) setSelectedMeetingId(null);
    await loadDashboardData(false);
    setSaveMessage("已刪除。");
  }

  async function importMeetingDoc(meeting: MeetingSummary) {
    if (!supabase || !meeting.notes_doc_url) return null;

    setImportingMeetingId(meeting.id);
    setSaveMessage("正在匯入 Google Doc...");
    const { data, error } = await supabase.functions.invoke("import-meeting-doc", {
      body: {
        meetingId: meeting.id,
        url: meeting.notes_doc_url,
      },
    });
    setImportingMeetingId(null);

    if (error) {
      console.error(error);
      setSaveMessage("匯入失敗。請確認 Google Doc 已開放連結讀取，或已發布到網路。");
      return null;
    }

    const updatedMeeting = (data as { meeting?: MeetingSummary }).meeting;
    if (!updatedMeeting) {
      setSaveMessage("匯入失敗，後端未回傳會議資料。");
      return null;
    }

    setMeetings((current) => current.map((item) => (item.id === updatedMeeting.id ? updatedMeeting : item)));
    setMeetingDetail((current) =>
      current?.meeting.id === updatedMeeting.id
        ? { ...current, meeting: updatedMeeting }
        : current,
    );
    setSaveMessage("已從 Google Doc 匯入會議記錄。");
    return updatedMeeting;
  }

  async function addMeetingRecord() {
    if (!supabase) { setSaveMessage("Supabase 尚未連線。"); return; }
    if (!newMeetingRecord.title.trim()) { setSaveMessage("請填寫會議名稱。"); return; }
    if (!newMeetingRecord.meeting_date) { setSaveMessage("請填寫會議日期。"); return; }

    setSaveMessage("新增會議記錄中...");
    const notesHtml = buildMeetingRecordHtml(newMeetingRecord);
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title: newMeetingRecord.title.trim(),
        meeting_date: newMeetingRecord.meeting_date,
        summary: null,
        notes: `${FORMATTED_MEETING_NOTES_PREFIX}\n${STRUCTURED_MEETING_RECORD_PREFIX}\n${notesHtml}`,
        google_meet_url: nullable(newMeetingRecord.google_meet_url),
        notes_doc_url: nullable(newMeetingRecord.notes_doc_url),
      })
      .select("id,project_id,title,meeting_date,summary,notes,google_meet_url,notes_doc_url")
      .single();

    if (error) {
      console.error(error);
      setSaveMessage(`新增失敗：${error.message || error.code || JSON.stringify(error)}`);
      return;
    }

    if (!data) {
      setSaveMessage("新增失敗：沒有回傳資料，請確認 RLS 政策允許 INSERT。");
      return;
    }

    setMeetings((current) => [data as MeetingSummary, ...current]);
    setNewMeetingRecord(emptyNewMeetingRecord);
    setIsAddingMeetingRecord(false);
    setSaveMessage("已新增會議記錄。");
  }

  async function addAnnouncement() {
    if (!supabase || !newAnnouncement.title.trim()) return;

    setSaveMessage("新增公告中...");
    const { data, error } = await supabase
      .from("announcements")
      .insert({ title: newAnnouncement.title.trim(), body: nullable(newAnnouncement.body) })
      .select("id,title,body,created_at")
      .single();

    if (error) {
      console.error(error);
      setSaveMessage("新增公告失敗，請確認你已登入且有公告新增權限。");
      return;
    }

    setAnnouncements((current) => [data as AnnouncementSummary, ...current]);
    setNewAnnouncement({ title: "", body: "" });
    setIsAddingAnnouncement(false);
    setSaveMessage("已新增公告。");
  }

  async function deleteAnnouncement(id: string) {
    if (!supabase) return;
    if (!window.confirm("確定要刪除此公告？")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      console.error(error);
      setSaveMessage("刪除公告失敗，只有建立者或管理員可以刪除。");
      return;
    }

    setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
    setSaveMessage("已刪除公告。");
  }

  async function addCalendarEvent() {
    if (!supabase || !newCalendarEvent.title.trim() || !newCalendarEvent.event_date) return;

    setSaveMessage("新增行事曆內容中...");
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title: newCalendarEvent.title.trim(),
        event_date: newCalendarEvent.event_date,
        project_id: nullable(newCalendarEvent.project_id),
        location: nullable(newCalendarEvent.location),
        url: nullable(newCalendarEvent.url),
        description: nullable(newCalendarEvent.description),
      })
      .select("id,project_id,title,event_date,description,location,url,created_at")
      .single();

    if (error) {
      console.error(error);
      setSaveMessage("新增行事曆內容失敗，請確認你有權限。");
      return;
    }

    setCalendarEvents((current) =>
      [...current, data as CalendarEventSummary].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    );
    setNewCalendarEvent(emptyNewCalendarEvent);
    setIsAddingCalendarEvent(false);
    setSaveMessage("已新增行事曆內容。");
  }

  async function deleteCalendarEvent(id: string) {
    if (!supabase) return;
    if (!window.confirm("確定要刪除此行事曆內容？")) return;

    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) {
      console.error(error);
      setSaveMessage("刪除行事曆內容失敗，只有建立者或管理員可以刪除。");
      return;
    }

    setCalendarEvents((current) => current.filter((event) => event.id !== id));
    setSaveMessage("已刪除行事曆內容。");
  }

  function handleDriveUploadSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const fileName = event.target.files?.[0]?.name;
    event.target.value = "";
    window.open(DRIVE_FOLDER_URL, "_blank", "noopener,noreferrer");
    setSaveMessage(fileName ? `請在 Google Drive 資料夾中完成上傳：${fileName}` : "請在 Google Drive 資料夾中完成上傳。");
  }

  function syncDriveFolder() {
    setDriveRefreshKey((current) => current + 1);
    setDriveSyncedAt(new Date());
  }

  function startEdit(kind: EditKind, item: { id: string } & object) {
    const values = Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, value == null ? "" : String(value)]),
    );
    setSaveMessage("");
    setEditing({ kind, id: String(item.id), values });
  }

  function startMeetingEdit(meeting: MeetingSummary) {
    setSelectedMeetingId(meeting.id);
    setMeetingDetail((current) =>
      current?.meeting.id === meeting.id ? current : { meeting, decisions: [] },
    );
    const parsed = parseMeetingRecordHtml(meeting.notes);
    setEditingMeetingRecord({
      ...parsed,
      id: meeting.id,
      google_meet_url: meeting.google_meet_url ?? "",
      notes_doc_url: meeting.notes_doc_url ?? "",
    });
    setSaveMessage("");
  }

  async function saveMeetingRecordEdit() {
    if (!supabase || !editingMeetingRecord || !session?.access_token) return;
    setSaveMessage("儲存中...");
    const notesHtml = buildMeetingRecordHtml(editingMeetingRecord);
    try {
      const updatedMeeting = await updateSupabaseRow<MeetingSummary>(
        "meetings",
        editingMeetingRecord.id,
        {
          title: nullable(editingMeetingRecord.title),
          meeting_date: nullable(editingMeetingRecord.meeting_date),
          notes: `${FORMATTED_MEETING_NOTES_PREFIX}\n${STRUCTURED_MEETING_RECORD_PREFIX}\n${notesHtml}`,
          google_meet_url: nullable(editingMeetingRecord.google_meet_url),
          notes_doc_url: nullable(editingMeetingRecord.notes_doc_url),
        },
        "id,project_id,title,meeting_date,summary,notes,google_meet_url,notes_doc_url",
      );
      setMeetings((items) => items.map((item) => (item.id === editingMeetingRecord.id ? updatedMeeting : item)));
      setMeetingDetail((current) =>
        current?.meeting.id === editingMeetingRecord.id ? { ...current, meeting: updatedMeeting } : current,
      );
      setEditingMeetingRecord(null);
      setSaveMessage("已儲存會議記錄。");
    } catch (error) {
      console.error(error);
      setSaveMessage(error instanceof Error ? `儲存失敗：${error.message}` : "儲存失敗，請確認你有編輯權限。");
    }
  }

  function setEditingMeetingRecordValue(field: keyof Omit<NewMeetingRecordState, "decisions" | "todos">, value: string) {
    setEditingMeetingRecord((current) => current ? { ...current, [field]: value } : current);
  }

  function setEditingMeetingDecisionValue(index: number, field: keyof NewMeetingDecisionRow, value: string) {
    setEditingMeetingRecord((current) => current ? {
      ...current,
      decisions: current.decisions.map((d, i) => i === index ? { ...d, [field]: value } : d),
    } : current);
  }

  function addEditingMeetingDecisionRow() {
    setEditingMeetingRecord((current) => current ? { ...current, decisions: [...current.decisions, { ...emptyMeetingDecision }] } : current);
  }

  function removeEditingMeetingDecisionRow(index: number) {
    setEditingMeetingRecord((current) => {
      if (!current) return current;
      return {
        ...current,
        decisions: current.decisions.length > 1
          ? current.decisions.filter((_, i) => i !== index)
          : [{ ...emptyMeetingDecision }],
      };
    });
  }

  function setEditingMeetingTodoValue(index: number, field: keyof NewMeetingTodoRow, value: string) {
    setEditingMeetingRecord((current) => current ? {
      ...current,
      todos: current.todos.map((t, i) => i === index ? { ...t, [field]: value } : t),
    } : current);
  }

  function addEditingMeetingTodoRow() {
    setEditingMeetingRecord((current) => current ? { ...current, todos: [...current.todos, { ...emptyMeetingTodo }] } : current);
  }

  function removeEditingMeetingTodoRow(index: number) {
    setEditingMeetingRecord((current) => {
      if (!current) return current;
      return {
        ...current,
        todos: current.todos.length > 1
          ? current.todos.filter((_, i) => i !== index)
          : [{ ...emptyMeetingTodo }],
      };
    });
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

  function setNewMeetingRecordValue(field: keyof Omit<NewMeetingRecordState, "decisions" | "todos">, value: string) {
    setNewMeetingRecord((current) => ({ ...current, [field]: value }));
  }

  function setMeetingDecisionValue(index: number, field: keyof NewMeetingDecisionRow, value: string) {
    setNewMeetingRecord((current) => ({
      ...current,
      decisions: current.decisions.map((decision, decisionIndex) =>
        decisionIndex === index ? { ...decision, [field]: value } : decision,
      ),
    }));
  }

  function addMeetingDecisionRow() {
    setNewMeetingRecord((current) => ({
      ...current,
      decisions: [...current.decisions, { ...emptyMeetingDecision }],
    }));
  }

  function removeMeetingDecisionRow(index: number) {
    setNewMeetingRecord((current) => ({
      ...current,
      decisions: current.decisions.length > 1
        ? current.decisions.filter((_decision, decisionIndex) => decisionIndex !== index)
        : [{ ...emptyMeetingDecision }],
    }));
  }

  function setMeetingTodoValue(index: number, field: keyof NewMeetingTodoRow, value: string) {
    setNewMeetingRecord((current) => ({
      ...current,
      todos: current.todos.map((todo, todoIndex) =>
        todoIndex === index ? { ...todo, [field]: value } : todo,
      ),
    }));
  }

  function addMeetingTodoRow() {
    setNewMeetingRecord((current) => ({
      ...current,
      todos: [...current.todos, { ...emptyMeetingTodo }],
    }));
  }

  function removeMeetingTodoRow(index: number) {
    setNewMeetingRecord((current) => ({
      ...current,
      todos: current.todos.length > 1
        ? current.todos.filter((_todo, todoIndex) => todoIndex !== index)
        : [{ ...emptyMeetingTodo }],
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

  function startAddTask() {
    setSaveMessage("");
    setEditing(null);
    setNewTask(emptyNewTask);
    setIsAddingTask(true);
  }

  function cancelAddTask() {
    setSaveMessage("");
    setNewTask(emptyNewTask);
    setIsAddingTask(false);
  }

  function setNewTaskValue(field: keyof NewTaskState, value: string) {
    setNewTask((current) => ({
      ...current,
      [field]: value,
      ...(field === "status" && value !== "blocked" ? { blocker_reason: "" } : {}),
    }));
  }

  async function addTask(projectId: string) {
    if (!supabase || !newTask.title.trim()) return;

    setSaveMessage("新增任務中...");
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: newTask.title.trim(),
        status: newTask.status,
        priority: newTask.priority,
        start_date: nullable(newTask.start_date),
        due_date: nullable(newTask.due_date),
        completed_date: nullable(newTask.completed_date),
        owner_names: nullable(newTask.owner_names),
        collaborator_names: nullable(newTask.collaborator_names),
        output_title: nullable(newTask.output_title),
        blocker_reason: newTask.status === "blocked" ? nullable(newTask.blocker_reason) : null,
      })
      .select("id,project_id,title,status,priority,start_date,due_date,completed_date,blocker_reason,owner_names,collaborator_names,output_title")
      .single();

    if (error) {
      console.error(error);
      setSaveMessage("新增任務失敗，請確認你有專案編輯權限。");
      return;
    }

    setTasks((current) => [...current, data as TaskSummary]);
    setIsAddingTask(false);
    setNewTask(emptyNewTask);
    await loadDashboardData(false);
    setSaveMessage("已新增任務，甘特圖已同步。");
  }

  async function deleteTask(id: string) {
    if (!supabase) return;
    if (!window.confirm("確定要刪除此專案任務？此操作無法復原。")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error(error);
      setSaveMessage("刪除任務失敗，請確認你有專案編輯權限。");
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== id));
    await loadDashboardData(false);
    setSaveMessage("已刪除任務，甘特圖已同步。");
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
      description: nullable(newProject.project_purpose),
      status: newProject.status,
      owner_names: nullable(newProject.owner_names),
      project_purpose: nullable(newProject.project_purpose),
      project_background: nullable(newProject.project_background),
      participating_units: nullable(newProject.participating_units),
      start_date: nullable(newProject.start_date),
      expected_end_date: nullable(newProject.expected_end_date),
      budget_range: nullable(newProject.budget_range),
      google_drive_folder_url: nullable(newProject.google_drive_folder_url),
      drive_folder_label: nullable(newProject.drive_folder_label),
      drive_folder_purpose: nullable(newProject.drive_folder_purpose),
    };
    const { data, error } = await supabase
      .from("projects")
      .insert(payload)
      .select("id,name,slug,description,status,owner_names,project_purpose,project_background,participating_units,start_date,expected_end_date,budget_range,google_drive_folder_url,drive_folder_label,drive_folder_purpose,updated_at")
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
    if (!supabase || !editing || !session?.access_token) return;

    setSaveMessage("儲存中...");
    const { kind, id, values } = editing;
    const originalMeeting = kind === "meeting"
      ? meetings.find((meeting) => meeting.id === id) ?? meetingDetail?.meeting ?? null
      : null;
    const payloadByKind: Record<EditKind, Record<string, string | null>> = {
      project: {
        name: nullable(values.name),
        description: nullable(values.project_purpose),
        status: values.status,
        owner_names: nullable(values.owner_names),
        project_purpose: nullable(values.project_purpose),
        project_background: nullable(values.project_background),
        participating_units: nullable(values.participating_units),
        start_date: nullable(values.start_date),
        expected_end_date: nullable(values.expected_end_date),
        budget_range: nullable(values.budget_range),
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
        notes: normalizeMeetingNotesForSave(values.notes, originalMeeting?.notes),
        google_meet_url: nullable(values.google_meet_url),
        notes_doc_url: nullable(values.notes_doc_url),
      },
    };

    try {
      if (kind === "project") {
        setSaveMessage("送出專案更新...");
        const updatedProject = await updateSupabaseRow<ProjectSummary>(
          "projects",
          id,
          payloadByKind.project,
          "id,name,slug,description,status,owner_names,project_purpose,project_background,participating_units,start_date,expected_end_date,budget_range,google_drive_folder_url,drive_folder_label,drive_folder_purpose,updated_at",
        );

        setProjects((items) => items.map((item) => (item.id === id ? updatedProject : item)));
        setEditing(null);
        await loadDashboardData(false);
        setSaveMessage("已更新，甘特圖已同步。");
        return;
      }

      if (kind === "meeting") {
        setSaveMessage("送出會議更新...");
        const updatedMeeting = await updateSupabaseRow<MeetingSummary>(
          "meetings",
          id,
          payloadByKind.meeting,
          "id,project_id,title,meeting_date,summary,notes,google_meet_url,notes_doc_url",
        );

        setSaveMessage("已更新。");
        setMeetings((items) => items.map((item) => (item.id === id ? updatedMeeting : item)));
        setMeetingDetail((current) =>
          current?.meeting.id === id ? { ...current, meeting: updatedMeeting } : current,
        );
        setEditing(null);
        return;
      }

      setSaveMessage("送出任務更新...");
      const updatedTask = await updateSupabaseRow<TaskSummary>(
        "tasks",
        id,
        payloadByKind.task,
        "id,project_id,title,status,priority,start_date,due_date,completed_date,blocker_reason,owner_names,collaborator_names,output_title",
      );

      setTasks((items) => items.map((item) => (item.id === id ? updatedTask : item)));
      setEditing(null);
      await loadDashboardData(false);
      setSaveMessage("已更新，甘特圖已同步。");
    } catch (error) {
      console.error(error);
      setSaveMessage(error instanceof Error ? `儲存失敗：${error.message}` : "儲存失敗，請確認你有編輯權限。");
    }
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

  function meetingEditActions(meeting: MeetingSummary) {
    const active = editingMeetingRecord?.id === meeting.id;

    return active ? (
      <div className="row-actions">
        <button className="icon-button" type="button" onClick={saveMeetingRecordEdit} title="儲存" aria-label="儲存">
          <Save size={16} />
        </button>
        <button className="icon-button" type="button" onClick={() => { setEditingMeetingRecord(null); setSaveMessage(""); }} title="取消" aria-label="取消">
          <X size={16} />
        </button>
      </div>
    ) : (
      <button className="icon-button" type="button" onClick={() => startMeetingEdit(meeting)} title="編輯" aria-label="編輯">
        <Pencil size={16} />
      </button>
    );
  }

  function editInput(field: string, label: string, type = "text") {
    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditValue(field, event.target.value);
    };

    return (
      <label>
        {label}
        <input type={type} value={editing?.values[field] ?? ""} onChange={handleInput} onInput={handleInput} />
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
    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewProjectValue(field, event.target.value);
    };

    return (
      <label>
        {label}
        <input type={type} value={newProject[field]} onChange={handleInput} onInput={handleInput} />
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

  function newTaskInput(field: keyof NewTaskState, label: string, type = "text") {
    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewTaskValue(field, event.target.value);
    };

    return (
      <label>
        {label}
        <input type={type} value={newTask[field]} onChange={handleInput} onInput={handleInput} />
      </label>
    );
  }

  function newTaskSelect(field: keyof NewTaskState, label: string, options: Array<[string, string]>) {
    return (
      <label>
        {label}
        <select value={newTask[field]} onChange={(event) => setNewTaskValue(field, event.target.value)}>
          {options.map(([value, labelText]) => (
            <option value={value} key={value}>
              {labelText}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function memberChips(value: string, onChange: (v: string) => void) {
    function toggle(name: string) {
      const parts = value.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean);
      const idx = parts.indexOf(name);
      const next = idx >= 0 ? parts.filter((_, i) => i !== idx) : [...parts, name];
      onChange(next.join("、"));
    }
    const active = new Set(value.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean));
    return (
      <div className="member-chips">
        {MEMBERS.map((name) => (
          <button
            key={name}
            type="button"
            className={`member-chip${active.has(name) ? " member-chip--active" : ""}`}
            onClick={() => toggle(name)}
          >
            {name}
          </button>
        ))}
      </div>
    );
  }

  function newMeetingInput(
    field: keyof Omit<NewMeetingRecordState, "decisions" | "todos">,
    label: string,
    type = "text",
    withMemberList = false,
  ) {
    return (
      <label>
        {label}
        <input
          type={type}
          list={withMemberList ? "rotary-members" : undefined}
          value={newMeetingRecord[field]}
          onChange={(event) => setNewMeetingRecordValue(field, event.target.value)}
        />
      </label>
    );
  }

  function newMeetingTextarea(
    field: keyof Omit<NewMeetingRecordState, "decisions" | "todos">,
    label: string,
    withChips = false,
  ) {
    return (
      <div className="meeting-textarea-group">
        <label>
          {label}
          <textarea
            value={newMeetingRecord[field]}
            onChange={(event) => setNewMeetingRecordValue(field, event.target.value)}
          />
        </label>
        {withChips ? memberChips(String(newMeetingRecord[field]), (v) => setNewMeetingRecordValue(field, v)) : null}
      </div>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="shell shell--center">
        <section className="auth-panel">
          <img src="/rotary-logo.png" alt="扶輪標誌" className="rotary-logo" />
          <h1>{APP_NAME}</h1>
          <p>請設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY 以連線到系統。</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="shell shell--center">
        <form className="auth-panel" onSubmit={signIn}>
          <img src="/rotary-logo.png" alt="扶輪標誌" className="rotary-logo" />
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

  const kpiTasks: Record<string, TaskSummary[]> = {
    total: tasks,
    due7: tasks.filter((t) => {
      if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
      const today = new Date(); today.setHours(0,0,0,0);
      const due = new Date(`${t.due_date}T00:00:00`);
      const d7 = new Date(today); d7.setDate(d7.getDate() + 7);
      return due >= today && due <= d7;
    }),
    overdue: tasks.filter((t) => {
      if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
      const today = new Date(); today.setHours(0,0,0,0);
      return new Date(`${t.due_date}T00:00:00`) < today;
    }),
    blocked: tasks.filter((t) => t.status === "blocked"),
  };

  const kpiLabels: Record<string, string> = {
    total: "全部進行中任務",
    due7: "七天內到期任務",
    overdue: "逾期任務",
    blocked: "受阻任務",
  };
  const kpiProjectRows = Object.fromEntries(
    Object.entries(kpiTasks).map(([key, matchingTasks]) => {
      const rows = projects
        .map((project) => {
          const projectTasks = tasks.filter((task) => task.project_id === project.id);
          const matchedTasks = matchingTasks.filter((task) => task.project_id === project.id);
          const activeTasks = projectTasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
          const nextDue = activeTasks
            .map((task) => task.due_date)
            .filter((dueDate): dueDate is string => Boolean(dueDate))
            .sort()[0] ?? null;

          return {
            project,
            matchedCount: matchedTasks.length,
            totalCount: projectTasks.length,
            activeCount: activeTasks.length,
            nextDue,
          };
        })
        .filter((row) => row.matchedCount > 0)
        .sort((a, b) => b.matchedCount - a.matchedCount || a.project.name.localeCompare(b.project.name, "zh-Hant"));

      return [key, rows];
    }),
  ) as Record<
    string,
    Array<{
      project: ProjectSummary;
      matchedCount: number;
      totalCount: number;
      activeCount: number;
      nextDue: string | null;
    }>
  >;

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedProjectTasks = selectedProject
    ? tasks.filter((task) => task.project_id === selectedProject.id)
    : [];
  const selectedMeeting =
    selectedMeetingId && meetingDetail?.meeting.id === selectedMeetingId
      ? meetingDetail.meeting
      : meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null;
  const selectedMeetingNotesHtml = selectedMeeting ? getFormattedMeetingHtml(selectedMeeting.notes) : null;
  const selectedMeetingProject = selectedMeeting?.project_id
    ? projects.find((project) => project.id === selectedMeeting.project_id) ?? null
    : null;
  const selectedMeetingDecisions =
    selectedMeetingId && meetingDetail?.meeting.id === selectedMeetingId ? meetingDetail.decisions : [];
  const platformMeetingRecords = meetings.filter((meeting) =>
    meeting.notes?.includes(STRUCTURED_MEETING_RECORD_PREFIX)
    || (meeting.notes?.startsWith(FORMATTED_MEETING_NOTES_PREFIX) && !meeting.notes_doc_url),
  );
  const visibleSaveMessage =
    saveMessage && !saveMessage.startsWith("已") ? saveMessage : "";

  if (selectedMeeting) {
    return (
      <main className="shell">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/rotary-logo.png" alt="扶輪標誌" className="rotary-logo" />
            <div>
              <p className="eyebrow">國際扶輪 3481 地區 AI 委員會</p>
              <h1>{APP_NAME}</h1>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={signOut} title="登出" aria-label="登出">
            <LogOut size={18} />
          </button>
        </header>

        {visibleSaveMessage ? <section className="notice">{visibleSaveMessage}</section> : null}

        <section className="project-page">
          <button className="back-button" type="button" onClick={() => setSelectedMeetingId(null)}>
            <ArrowLeft size={16} />
            返回會議列表
          </button>

          <div className="project-hero">
            <div>
              <p className="eyebrow">會議記錄</p>
              <h2>{selectedMeeting.title}</h2>
              <p>{selectedMeeting.meeting_date}</p>
            </div>
            <div className="row-actions">
              {selectedMeeting.google_meet_url ? (
                <a href={selectedMeeting.google_meet_url} target="_blank" rel="noreferrer" title="開啟 Google Meet">
                  <ExternalLink size={16} />
                </a>
              ) : null}
              {selectedMeeting.notes_doc_url ? (
                <a href={selectedMeeting.notes_doc_url} target="_blank" rel="noreferrer" title="開啟 Google Doc">
                  <ExternalLink size={16} />
                </a>
              ) : null}
              {selectedMeeting.notes_doc_url ? (
                <button
                  className="btn-add"
                  type="button"
                  onClick={() => importMeetingDoc(selectedMeeting)}
                  title="同步 Google Doc"
                  aria-label="同步 Google Doc"
                  disabled={importingMeetingId === selectedMeeting.id}
                >
                  <FileDown size={14} /> 同步 Google Doc
                </button>
              ) : null}
              {meetingEditActions(selectedMeeting)}
              <button
                className="icon-button icon-button--danger"
                type="button"
                onClick={() => deleteMeeting(selectedMeeting.id)}
                title="刪除此會議記錄"
                aria-label="刪除"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {editingMeetingRecord?.id === selectedMeeting.id ? (
            <div className="add-meeting-form">
              <section className="meeting-form-section">
                <h3>會議基本資訊</h3>
                <div className="edit-grid">
                  <label>會議名稱<input value={editingMeetingRecord.title} onChange={(e) => setEditingMeetingRecordValue("title", e.target.value)} /></label>
                  <label>會議日期<input type="date" value={editingMeetingRecord.meeting_date} onChange={(e) => setEditingMeetingRecordValue("meeting_date", e.target.value)} /></label>
                  <label>會議方式<input value={editingMeetingRecord.meeting_method} onChange={(e) => setEditingMeetingRecordValue("meeting_method", e.target.value)} /></label>
                  <label>主持人<input list="rotary-members" value={editingMeetingRecord.host} onChange={(e) => setEditingMeetingRecordValue("host", e.target.value)} /></label>
                  <div className="meeting-textarea-group">
                    <label>與會人員<textarea value={editingMeetingRecord.attendees} onChange={(e) => setEditingMeetingRecordValue("attendees", e.target.value)} /></label>
                    {memberChips(editingMeetingRecord.attendees, (v) => setEditingMeetingRecordValue("attendees", v))}
                  </div>
                  <div className="meeting-textarea-group">
                    <label>待確認出席<textarea value={editingMeetingRecord.pending_attendees} onChange={(e) => setEditingMeetingRecordValue("pending_attendees", e.target.value)} /></label>
                    {memberChips(editingMeetingRecord.pending_attendees, (v) => setEditingMeetingRecordValue("pending_attendees", v))}
                  </div>
                  <label>Google Meet 連結<input type="url" value={editingMeetingRecord.google_meet_url} onChange={(e) => setEditingMeetingRecordValue("google_meet_url", e.target.value)} /></label>
                  <label>Google Doc 連結<input type="url" value={editingMeetingRecord.notes_doc_url} onChange={(e) => setEditingMeetingRecordValue("notes_doc_url", e.target.value)} /></label>
                </div>
              </section>
              <section className="meeting-form-section">
                <div className="meeting-form-section__head">
                  <h3>會議決議</h3>
                  <button className="btn-add" type="button" onClick={addEditingMeetingDecisionRow}><Plus size={14} />新增決議</button>
                </div>
                <div className="meeting-form-list">
                  {editingMeetingRecord.decisions.map((decision, index) => (
                    <article className="meeting-form-card" key={`edit-decision-${index}`}>
                      <div className="meeting-form-card__head">
                        <span>決議 {index + 1}</span>
                        <button className="icon-button" type="button" onClick={() => removeEditingMeetingDecisionRow(index)} title="移除此決議" aria-label="移除此決議"><X size={14} /></button>
                      </div>
                      <div className="edit-grid meeting-decision-grid">
                        <label>事項主題<input value={decision.topic} onChange={(e) => setEditingMeetingDecisionValue(index, "topic", e.target.value)} /></label>
                        <label>指定負責人<input list="rotary-members" value={decision.owner} onChange={(e) => setEditingMeetingDecisionValue(index, "owner", e.target.value)} /></label>
                        <label>合作對象<input list="rotary-members" value={decision.collaborators} onChange={(e) => setEditingMeetingDecisionValue(index, "collaborators", e.target.value)} /></label>
                        <label>時間／進度<input value={decision.schedule} onChange={(e) => setEditingMeetingDecisionValue(index, "schedule", e.target.value)} /></label>
                        <label>內容備註<textarea value={decision.notes} onChange={(e) => setEditingMeetingDecisionValue(index, "notes", e.target.value)} /></label>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section className="meeting-form-section">
                <div className="meeting-form-section__head">
                  <h3>待辦事項</h3>
                  <button className="btn-add" type="button" onClick={addEditingMeetingTodoRow}><Plus size={14} />新增待辦</button>
                </div>
                <div className="meeting-form-list">
                  {editingMeetingRecord.todos.map((todo, index) => (
                    <article className="meeting-form-card" key={`edit-todo-${index}`}>
                      <div className="meeting-form-card__head">
                        <span>待辦 {index + 1}</span>
                        <button className="icon-button" type="button" onClick={() => removeEditingMeetingTodoRow(index)} title="移除此待辦" aria-label="移除此待辦"><X size={14} /></button>
                      </div>
                      <div className="edit-grid meeting-todo-grid">
                        <label>負責人<input list="rotary-members" value={todo.owner} onChange={(e) => setEditingMeetingTodoValue(index, "owner", e.target.value)} /></label>
                        <label>待辦事項<textarea value={todo.task} onChange={(e) => setEditingMeetingTodoValue(index, "task", e.target.value)} /></label>
                        <label>期限<input value={todo.due} onChange={(e) => setEditingMeetingTodoValue(index, "due", e.target.value)} /></label>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section className="meeting-form-section">
                <h3>下次會議</h3>
                <div className="edit-grid">
                  <label>時間<input value={editingMeetingRecord.next_meeting_date} onChange={(e) => setEditingMeetingRecordValue("next_meeting_date", e.target.value)} /></label>
                  <label>方式<input value={editingMeetingRecord.next_meeting_method} onChange={(e) => setEditingMeetingRecordValue("next_meeting_method", e.target.value)} /></label>
                  <label>主要議題<textarea value={editingMeetingRecord.next_meeting_topics} onChange={(e) => setEditingMeetingRecordValue("next_meeting_topics", e.target.value)} /></label>
                  <div className="meeting-textarea-group">
                    <label>需邀請人員<textarea value={editingMeetingRecord.next_meeting_invitees} onChange={(e) => setEditingMeetingRecordValue("next_meeting_invitees", e.target.value)} /></label>
                    {memberChips(editingMeetingRecord.next_meeting_invitees, (v) => setEditingMeetingRecordValue("next_meeting_invitees", v))}
                  </div>
                </div>
              </section>
              <div className="form-actions">
                <button type="button" onClick={saveMeetingRecordEdit}>儲存</button>
                <button type="button" className="btn-cancel" onClick={() => { setEditingMeetingRecord(null); setSaveMessage(""); }}>取消</button>
              </div>
            </div>
          ) : null}

          <section className="project-detail-grid">
            <article className="detail-card">
              <span>會議日期</span>
              <strong>{selectedMeeting.meeting_date}</strong>
            </article>
            <article className="detail-card">
              <span>關聯專案</span>
              <strong>{selectedMeetingProject?.name ?? "未連結專案"}</strong>
            </article>
            <article className="detail-card">
              <span>Google Doc</span>
              <strong>{selectedMeeting.notes_doc_url ? "已連結" : "未連結"}</strong>
            </article>
            <article className="detail-card">
              <span>會議決議</span>
              <strong>{selectedMeetingDecisions.length}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <CalendarDays size={18} />
              <h2>完整原始資訊</h2>
            </div>
            {selectedMeeting.notes || selectedMeetingDecisions.length > 0 ? (
              <div className="meeting-original-content">
                {selectedMeetingNotesHtml ? (
                  <div
                    className="meeting-notes meeting-notes--full meeting-notes--formatted"
                    dangerouslySetInnerHTML={{ __html: selectedMeetingNotesHtml }}
                  />
                ) : selectedMeeting.notes ? (
                  <pre className="meeting-notes meeting-notes--full">{selectedMeeting.notes}</pre>
                ) : null}
                {selectedMeetingDecisions.length > 0 ? (
                  <div className="meeting-original-decisions">
                    <h4>會議決議</h4>
                    <ol className="meeting-decisions">
                      {selectedMeetingDecisions.map((decision, index) => (
                        <li key={decision.id}>
                          <span className="decision-index">{index + 1}</span>
                          <span>{decision.decision}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="empty">此會議尚未匯入或填寫完整內容。</p>
            )}
          </section>
        </section>
      </main>
    );
  }

  if (selectedProject) {
    return (
      <main className="shell">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/rotary-logo.png" alt="扶輪標誌" className="rotary-logo" />
            <div>
              <p className="eyebrow">國際扶輪 3481 地區 AI 委員會</p>
              <h1>{APP_NAME}</h1>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={signOut} title="登出" aria-label="登出">
            <LogOut size={18} />
          </button>
        </header>

        {visibleSaveMessage ? <section className="notice">{visibleSaveMessage}</section> : null}

        <section className="project-page">
          <button className="back-button" type="button" onClick={() => setSelectedProjectId(null)}>
            <ArrowLeft size={16} />
            返回專案列表
          </button>

          <div className="project-hero">
            <div>
              <p className="eyebrow">專案詳情</p>
              <h2>{selectedProject.name}</h2>
              <p>{selectedProject.project_purpose ?? selectedProject.description ?? "尚未填寫專案目的。"}</p>
            </div>
            <div className="row-actions">
              {editActions("project", selectedProject)}
            </div>
          </div>

          {isEditing("project", selectedProject.id) ? (
            <section className="panel">
              <div className="edit-grid">
                {editInput("name", "專案名稱")}
                {editTextarea("project_purpose", "專案目的")}
                {editTextarea("project_background", "專案背景")}
                {editInput("owner_names", "專案負責人")}
                {editInput("participating_units", "參與單位")}
                {editInput("start_date", "預計啟動日期", "date")}
                {editInput("expected_end_date", "預計完成日期", "date")}
                {editInput("budget_range", "預算範圍")}
              </div>
            </section>
          ) : null}

          <section className="project-detail-grid">
            <article className="detail-card">
              <span>專案負責人</span>
              <strong>{selectedProject.owner_names ?? "未設定"}</strong>
            </article>
            <article className="detail-card">
              <span>預計啟動日期</span>
              <strong>{selectedProject.start_date ?? "未設定"}</strong>
            </article>
            <article className="detail-card">
              <span>預計完成日期</span>
              <strong>{selectedProject.expected_end_date ?? "未設定"}</strong>
            </article>
            <article className="detail-card">
              <span>預算範圍</span>
              <strong>{selectedProject.budget_range ?? "未設定"}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <FolderKanban size={18} />
              <h2>專案資料</h2>
            </div>
            <div className="detail-list">
              <div>
                <span>專案名稱</span>
                <strong>{selectedProject.name}</strong>
              </div>
              <div>
                <span>專案目的</span>
                <p>{selectedProject.project_purpose ?? selectedProject.description ?? "未設定"}</p>
              </div>
              <div>
                <span>專案背景</span>
                <p>{selectedProject.project_background ?? "未設定"}</p>
              </div>
              <div>
                <span>參與單位</span>
                <strong>{selectedProject.participating_units ?? "未設定"}</strong>
              </div>
              <div>
                <span>專案負責人</span>
                <strong>{selectedProject.owner_names ?? "未設定"}</strong>
              </div>
              <div>
                <span>預計啟動日期</span>
                <strong>{selectedProject.start_date ?? "未設定"}</strong>
              </div>
              <div>
                <span>預計完成日期</span>
                <strong>{selectedProject.expected_end_date ?? "未設定"}</strong>
              </div>
              <div>
                <span>預算範圍</span>
                <strong>{selectedProject.budget_range ?? "未設定"}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <CalendarDays size={18} />
              <h2>專案任務</h2>
              <button className="icon-button panel-action" type="button" onClick={startAddTask} title="新增任務" aria-label="新增任務">
                <Plus size={16} />
              </button>
            </div>
            {isAddingTask ? (
              <div className="add-project-form">
                <div className="edit-grid">
                  {newTaskInput("title", "任務標題")}
                  {newTaskSelect("status", "狀態", taskStatusOptions)}
                  {newTaskSelect("priority", "優先級", priorityOptions)}
                  {newTaskInput("start_date", "開始時間", "date")}
                  {newTaskInput("due_date", "期限", "date")}
                  {newTaskInput("completed_date", "完成時間", "date")}
                  {newTaskInput("owner_names", "負責人")}
                  {newTaskInput("collaborator_names", "協作者")}
                  {newTaskInput("output_title", "產出")}
                  {newTask.status === "blocked" ? newTaskInput("blocker_reason", "受阻原因") : null}
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => addTask(selectedProject.id)}>新增</button>
                  <button type="button" onClick={cancelAddTask}>取消</button>
                </div>
              </div>
            ) : null}
            <div className="detail-table">
              <div className="detail-table__head">
                <span>任務</span>
                <span>狀態</span>
                <span>負責人</span>
                <span>期限</span>
                <span>操作</span>
              </div>
              {selectedProjectTasks.map((task) => (
                <div className="detail-table__row" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    {task.output_title ? <span>產出：{task.output_title}</span> : null}
                  </div>
                  <span>{taskStatusLabels[task.status]}</span>
                  <span>{task.owner_names ?? "未指派"}</span>
                  <span>{task.due_date ?? "未設定"}</span>
                  <span className="row-actions">
                    {editActions("task", task)}
                    <button
                      className="icon-button icon-button--danger"
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      title="刪除此任務"
                      aria-label="刪除任務"
                    >
                      <X size={14} />
                    </button>
                  </span>
                  {isEditing("task", task.id) ? (
                    <div className="task-edit-row">
                      <div className="edit-grid">
                        {editInput("title", "任務標題")}
                        {editSelect("status", "狀態", taskStatusOptions)}
                        {editSelect("priority", "優先級", priorityOptions)}
                        {editInput("start_date", "開始時間", "date")}
                        {editInput("due_date", "期限", "date")}
                        {editInput("completed_date", "完成時間", "date")}
                        {editInput("owner_names", "負責人")}
                        {editInput("collaborator_names", "協作者")}
                        {editInput("output_title", "產出")}
                        {editing?.values.status === "blocked" ? editInput("blocker_reason", "受阻原因") : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              {selectedProjectTasks.length === 0 ? <p className="empty">此專案尚未建立任務。</p> : null}
            </div>
          </section>

        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <datalist id="rotary-members">
        {MEMBERS.map((name) => <option key={name} value={name} />)}
      </datalist>
      <header className="topbar">
        <div className="topbar-brand">
          <img src="/rotary-logo.png" alt="扶輪標誌" className="rotary-logo" />
          <div>
            <p className="eyebrow">國際扶輪 3481 地區 AI 委員會</p>
            <h1>{APP_NAME}</h1>
          </div>
        </div>
        <button className="icon-button" type="button" onClick={signOut} title="登出" aria-label="登出">
          <LogOut size={18} />
        </button>
      </header>

      {kpiModal ? (
        <div className="kpi-modal-backdrop" onClick={() => setKpiModal(null)}>
          <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kpi-modal-header">
              <h3>{kpiLabels[kpiModal]}（{kpiProjectRows[kpiModal].length} 個專案 / {kpiTasks[kpiModal].length} 項任務）</h3>
              <button className="icon-button" type="button" onClick={() => setKpiModal(null)} aria-label="關閉">
                <X size={16} />
              </button>
            </div>
            <div className="kpi-modal-body">
              {kpiProjectRows[kpiModal].length === 0 ? (
                <p className="empty">目前沒有符合條件的專案。</p>
              ) : (
                <>
                  <div className="kpi-project-row kpi-project-row--head">
                    <span>專案</span>
                    <span>符合任務</span>
                    <span>下一期限</span>
                  </div>
                  {kpiProjectRows[kpiModal].map((row) => (
                    <button
                      className="kpi-project-row"
                      type="button"
                      key={row.project.id}
                      onClick={() => {
                        setKpiModal(null);
                        setSelectedProjectId(row.project.id);
                      }}
                    >
                      <div>
                        <strong>{row.project.name}</strong>
                        <span>{labelFromMap(projectStatusLabels, row.project.status)} · 全部 {row.totalCount} 項 / 進行中 {row.activeCount} 項</span>
                      </div>
                      <span>{row.matchedCount} 項</span>
                      <span>{row.nextDue ?? "未設定"}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="stats-grid">
        <StatCard label="進行中任務" value={taskStats.total} onClick={() => setKpiModal("total")} />
        <StatCard label="七天內到期" value={taskStats.due7} tone="warn" onClick={() => setKpiModal("due7")} />
        <StatCard label="已逾期" value={taskStats.overdue} tone="danger" onClick={() => setKpiModal("overdue")} />
        <StatCard label="受阻任務" value={taskStats.blocked} tone="neutral" onClick={() => setKpiModal("blocked")} />
      </section>

      {loadState === "error" ? (
        <section className="notice">資料無法載入，請確認 Supabase 權限、RLS 政策與專案成員設定。</section>
      ) : null}
      {visibleSaveMessage ? <section className="notice">{visibleSaveMessage}</section> : null}

      <section className="content-grid">
        <div className="panel panel--wide">
          <div className="panel-heading">
            <Megaphone size={18} />
            <h2>公告欄</h2>
            <button
              className="icon-button panel-action"
              type="button"
              onClick={() => setIsAddingAnnouncement((current) => !current)}
              title="新增公告"
              aria-label="新增公告"
            >
              <Plus size={16} />
            </button>
          </div>
          {isAddingAnnouncement ? (
            <div className="add-project-form">
              <div className="edit-grid">
                <label>
                  公告標題
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(event) => setNewAnnouncement((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  公告內容
                  <textarea
                    value={newAnnouncement.body}
                    onChange={(event) => setNewAnnouncement((current) => ({ ...current, body: event.target.value }))}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={addAnnouncement}>新增</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAnnouncement(false);
                    setNewAnnouncement({ title: "", body: "" });
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}
          <div className="list">
            {announcements.map((announcement) => (
              <article className="list-row announcement-row" key={announcement.id}>
                <div>
                  <strong>{announcement.title}</strong>
                  <span>{new Date(announcement.created_at).toLocaleDateString("zh-TW")}</span>
                  {announcement.body ? <p>{announcement.body}</p> : null}
                </div>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => deleteAnnouncement(announcement.id)}
                  title="刪除公告"
                  aria-label="刪除公告"
                >
                  <X size={14} />
                </button>
              </article>
            ))}
            {announcements.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有公告。</p> : null}
          </div>
        </div>

        <div className="panel panel--wide">
          <div className="panel-heading">
            <CalendarDays size={18} />
            <h2>行事曆</h2>
            <div className="calendar-heading-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsAddingCalendarEvent((current) => !current)}
                title="新增行事曆內容"
                aria-label="新增行事曆內容"
              >
                <Plus size={16} />
              </button>
              <div className="calendar-controls">
                <button className="icon-button" type="button" onClick={() => shiftCalendarMonth(-1)} title="上一月" aria-label="上一月">
                  <ChevronLeft size={16} />
                </button>
                <strong>{calendarData.title}</strong>
                <button className="icon-button" type="button" onClick={() => shiftCalendarMonth(1)} title="下一月" aria-label="下一月">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <section className="rotary-theme-card">
            <div>
              <span>{calendarMonth.getMonth() + 1} 月扶輪主題月</span>
              <strong>{calendarData.theme.zh}</strong>
            </div>
            <p>{calendarData.theme.en}</p>
          </section>

          {isAddingCalendarEvent ? (
            <div className="add-project-form">
              <div className="edit-grid">
                <label>
                  標題
                  <input
                    type="text"
                    value={newCalendarEvent.title}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, title: event.target.value }))}
                    placeholder="例：社務會議、講座、截止日"
                  />
                </label>
                <label>
                  日期
                  <input
                    type="date"
                    value={newCalendarEvent.event_date}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, event_date: event.target.value }))}
                  />
                </label>
                <label>
                  關聯專案
                  <select
                    value={newCalendarEvent.project_id}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, project_id: event.target.value }))}
                  >
                    <option value="">不關聯專案</option>
                    {projects.map((project) => (
                      <option value={project.id} key={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  地點
                  <input
                    type="text"
                    value={newCalendarEvent.location}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, location: event.target.value }))}
                    placeholder="選填"
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  連結
                  <input
                    type="url"
                    value={newCalendarEvent.url}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, url: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  說明
                  <textarea
                    value={newCalendarEvent.description}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, description: event.target.value }))}
                    placeholder="選填"
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={addCalendarEvent}>新增</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCalendarEvent(false);
                    setNewCalendarEvent(emptyNewCalendarEvent);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}

          <div className="calendar-layout">
            <div className="calendar-grid" aria-label={`${calendarData.title} 行事曆`}>
              {weekdayLabels.map((weekday) => (
                <span className="calendar-weekday" key={weekday}>
                  {weekday}
                </span>
              ))}
              {calendarData.cells.map((cell) => (
                <div className={cell.isCurrentMonth ? "calendar-day" : "calendar-day calendar-day--muted"} key={cell.dateKey}>
                  <span className="calendar-date">{cell.date.getDate()}</span>
                  <div className="calendar-day-events">
                    {cell.events.slice(0, 3).map((event) => (
                      <button
                        className={`calendar-event calendar-event--${event.kind}`}
                        type="button"
                        onClick={() => openCalendarEvent(event)}
                        key={event.id}
                        title={`${event.label}：${event.title}`}
                      >
                        <span>{event.label}</span>
                        <strong>{event.title}</strong>
                      </button>
                    ))}
                    {cell.events.length > 3 ? <span className="calendar-more">+{cell.events.length - 3}</span> : null}
                  </div>
                </div>
              ))}
            </div>

            <aside className="calendar-agenda">
              <h3>本月重點</h3>
              {calendarData.monthEvents.length > 0 ? (
                <div className="calendar-agenda-list">
                  {calendarData.monthEvents.slice(0, 8).map((event) => {
                    const customEvent = event.calendarEventId
                      ? calendarEvents.find((item) => item.id === event.calendarEventId) ?? null
                      : null;

                    return (
                      <div className="calendar-agenda-row" key={event.id}>
                        <button className="calendar-agenda-item" type="button" onClick={() => openCalendarEvent(event)}>
                          <span>{formatMonthDay(toLocalDate(event.date) ?? new Date())}</span>
                          <div>
                            <strong>{event.title}</strong>
                            <p>{customEvent?.description ?? event.label}</p>
                            {customEvent?.location ? <p>{customEvent.location}</p> : null}
                          </div>
                        </button>
                        {customEvent?.url ? (
                          <a href={customEvent.url} target="_blank" rel="noreferrer" title="開啟連結" aria-label="開啟連結">
                            <ExternalLink size={15} />
                          </a>
                        ) : null}
                        {customEvent ? (
                          <button
                            className="icon-button icon-button--danger"
                            type="button"
                            onClick={() => deleteCalendarEvent(customEvent.id)}
                            title="刪除行事曆內容"
                            aria-label="刪除行事曆內容"
                          >
                            <X size={13} />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty">本月尚無專案、任務或會議排程。</p>
              )}
            </aside>
          </div>
        </div>

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
                  return (
                    <div className="gantt-row" key={row.project.id}>
                      <div className="gantt-project-meta">
                        <strong>{row.project.name}</strong>
                        <span>{startText} — {endText}</span>
                      </div>
                      <div className="gantt-track">
                        <div className="gantt-bar gantt-bar--project" style={{ left, width }} title={`${row.project.name} ${startText}–${endText}`}>
                          <span>{startText} — {endText}</span>
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

        <div className="panel panel--wide">
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
                {newProjectInput("owner_names", "專案負責人")}
                {newProjectInput("participating_units", "參與單位")}
                {newProjectInput("start_date", "預計啟動日期", "date")}
                {newProjectInput("expected_end_date", "預計完成日期", "date")}
                {newProjectInput("budget_range", "預算範圍")}
                {newProjectTextarea("project_purpose", "專案目的")}
                {newProjectTextarea("project_background", "專案背景")}
              </div>
              <div className="form-actions">
                <button type="button" onClick={addProject}>新增</button>
                <button type="button" onClick={cancelAddProject}>取消</button>
              </div>
            </div>
          ) : null}
          <div className="list">
            {projects.map((project) => (
              <article className="list-row project-list-row" key={project.id}>
                <button className="project-title-button" type="button" onClick={() => setSelectedProjectId(project.id)}>
                  <strong>{project.name}</strong>
                  <ChevronDown size={16} />
                </button>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      startEdit("project", project);
                    }}
                    title="編輯"
                    aria-label="編輯"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </article>
            ))}
            {projects.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有可查看的專案。</p> : null}
          </div>
        </div>

        <div className="panel panel--wide">
          <div className="panel-heading">
            <CalendarDays size={18} />
            <h2>會議記錄</h2>
            <div className="drive-actions">
              <button className="btn-add" type="button" onClick={() => setIsAddingMeetingRecord((current) => !current)}>
                {isAddingMeetingRecord ? <X size={14} /> : <Plus size={14} />}
                {isAddingMeetingRecord ? "收合表單" : "新增會議記錄"}
              </button>
              <a className="btn-add" href={MEETING_RECORDS_FOLDER_URL} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> 開啟資料夾
              </a>
            </div>
          </div>

          {isAddingMeetingRecord ? (
            <div className="add-meeting-form" ref={meetingFormRef}>
              <section className="meeting-form-section">
                <h4>會議資訊</h4>
                <div className="edit-grid">
                  {newMeetingInput("title", "會議名稱")}
                  {newMeetingInput("meeting_date", "會議日期", "date")}
                  {newMeetingInput("meeting_method", "會議方式")}
                  {newMeetingInput("host", "主持人", "text", true)}
                  {newMeetingTextarea("attendees", "與會人員", true)}
                  {newMeetingTextarea("pending_attendees", "待確認出席", true)}
                  {newMeetingInput("google_meet_url", "Google Meet 連結", "url")}
                  {newMeetingInput("notes_doc_url", "Google Doc 連結", "url")}
                </div>
              </section>

              <section className="meeting-form-section">
                <div className="meeting-form-section__head">
                  <h4>會議決議</h4>
                  <button className="btn-add" type="button" onClick={addMeetingDecisionRow}>
                    <Plus size={14} /> 新增決議
                  </button>
                </div>
                <div className="meeting-form-list">
                  {newMeetingRecord.decisions.map((decision, index) => (
                    <article className="meeting-form-card" key={`decision-${index}`}>
                      <div className="meeting-form-card__head">
                        <strong>決議 {index + 1}</strong>
                        <button className="icon-button" type="button" onClick={() => removeMeetingDecisionRow(index)} title="移除此決議" aria-label="移除此決議">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="edit-grid">
                        <label>
                          決議主題
                          <input value={decision.topic} onChange={(event) => setMeetingDecisionValue(index, "topic", event.target.value)} />
                        </label>
                        <label>
                          指定負責人
                          <input list="rotary-members" value={decision.owner} onChange={(event) => setMeetingDecisionValue(index, "owner", event.target.value)} />
                        </label>
                        <label>
                          合作對象
                          <input list="rotary-members" value={decision.collaborators} onChange={(event) => setMeetingDecisionValue(index, "collaborators", event.target.value)} />
                        </label>
                        <label>
                          時間／進度
                          <input value={decision.schedule} onChange={(event) => setMeetingDecisionValue(index, "schedule", event.target.value)} />
                        </label>
                        <label style={{ gridColumn: "1 / -1" }}>
                          內容
                          <textarea value={decision.notes} onChange={(event) => setMeetingDecisionValue(index, "notes", event.target.value)} />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="meeting-form-section">
                <div className="meeting-form-section__head">
                  <h4>待辦事項 To Do</h4>
                  <button className="btn-add" type="button" onClick={addMeetingTodoRow}>
                    <Plus size={14} /> 新增待辦
                  </button>
                </div>
                <div className="meeting-form-list">
                  {newMeetingRecord.todos.map((todo, index) => (
                    <article className="meeting-form-card" key={`todo-${index}`}>
                      <div className="meeting-form-card__head">
                        <strong>待辦 {index + 1}</strong>
                        <button className="icon-button" type="button" onClick={() => removeMeetingTodoRow(index)} title="移除此待辦" aria-label="移除此待辦">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="edit-grid meeting-todo-grid">
                        <label>
                          負責人
                          <input list="rotary-members" value={todo.owner} onChange={(event) => setMeetingTodoValue(index, "owner", event.target.value)} />
                        </label>
                        <label>
                          待辦事項
                          <textarea value={todo.task} onChange={(event) => setMeetingTodoValue(index, "task", event.target.value)} />
                        </label>
                        <label>
                          期限
                          <input value={todo.due} onChange={(event) => setMeetingTodoValue(index, "due", event.target.value)} />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="meeting-form-section">
                <h4>下次會議</h4>
                <div className="edit-grid">
                  {newMeetingInput("next_meeting_date", "時間")}
                  {newMeetingInput("next_meeting_method", "方式")}
                  {newMeetingTextarea("next_meeting_topics", "主要議題")}
                  {newMeetingTextarea("next_meeting_invitees", "需邀請人員", true)}
                </div>
              </section>

              <div className="form-actions">
                <button type="button" onClick={addMeetingRecord}>新增</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingMeetingRecord(false);
                    setNewMeetingRecord(emptyNewMeetingRecord);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}

          {platformMeetingRecords.length > 0 ? (
            <div className="list meeting-record-list">
              {platformMeetingRecords.map((meeting) => (
                <article className="list-row--meeting" key={meeting.id}>
                  <div
                    className="meeting-row-header"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedMeetingId(meeting.id);
                      setMeetingDetail({ meeting, decisions: [] });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedMeetingId(meeting.id);
                        setMeetingDetail({ meeting, decisions: [] });
                      }
                    }}
                  >
                    <div className="meeting-row-meta">
                      <span className="meeting-title">{meeting.title}</span>
                      <span className="meeting-date">{meeting.meeting_date}</span>
                    </div>
                    <div className="row-actions">
                      {meeting.notes_doc_url ? (
                        <a href={meeting.notes_doc_url} target="_blank" rel="noreferrer" title="開啟 Google Doc" onClick={(event) => event.stopPropagation()}>
                          <ExternalLink size={16} />
                        </a>
                      ) : null}
                      <button
                        className="icon-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startMeetingEdit(meeting);
                        }}
                        title="編輯"
                        aria-label="編輯"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-button icon-button--danger"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteMeeting(meeting.id);
                        }}
                        title="刪除此會議記錄"
                        aria-label="刪除"
                      >
                        <X size={14} />
                      </button>
                      <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="meeting-folder-panel">
            <iframe
              title="AI 委員會會議記錄 Google Drive 資料夾"
              src={MEETING_RECORDS_FOLDER_EMBED_URL}
              loading="lazy"
            />
          </div>
        </div>

        <div className="panel panel--wide">
          <div className="panel-heading">
            <HardDrive size={18} />
            <h2>Google Drive 檔案</h2>
            <div className="drive-actions">
              <a className="btn-add" href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> 開啟資料夾
              </a>
              <button className="btn-add" type="button" onClick={syncDriveFolder}>
                <RefreshCw size={14} /> 同步
              </button>
              <label className="btn-add drive-upload-button">
                <Upload size={14} /> 新增上傳檔案
                <input type="file" onChange={handleDriveUploadSelection} />
              </label>
            </div>
          </div>
          <div className="drive-panel">
            <div className="drive-sync-status">
              <span>最後同步</span>
              <strong>{driveSyncedAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</strong>
            </div>
            <iframe
              key={driveRefreshKey}
              title="3481 AI 委員會 Google Drive 資料夾"
              src={DRIVE_FOLDER_EMBED_URL}
              loading="lazy"
            />
          </div>
        </div>

      </section>
    </main>
  );
}

export default App;
