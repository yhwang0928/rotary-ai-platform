import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileDown, FolderKanban, LogOut, Megaphone, Pencil, Plus, Save, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { StatCard } from "./components/StatCard";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  AnnouncementSummary,
  CalendarEventSummary,
  MeetingDecision,
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
  description: string;
  status: string;
  start_date: string;
  expected_end_date: string;
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

const APP_NAME = "3481 Rotary AI專案管理平台";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
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
  description: "",
  status: "active",
  start_date: "",
  expected_end_date: "",
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
  const [meetingDetailLoading, setMeetingDetailLoading] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState<NewProjectState>(emptyNewProject);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskState>(emptyNewTask);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [kpiModal, setKpiModal] = useState<"total" | "due7" | "overdue" | "blocked" | null>(null);
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", meeting_date: "", notes: "", notes_doc_url: "" });
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "" });
  const [isAddingCalendarEvent, setIsAddingCalendarEvent] = useState(false);
  const [newCalendarEvent, setNewCalendarEvent] = useState<NewCalendarEventState>(emptyNewCalendarEvent);
  const [importingMeetingId, setImportingMeetingId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (showLoading = true) => {
    if (!supabase) return;

    if (showLoading) setLoadState("loading");
    try {
      const [projectResult, taskResult, meetingResult, announcementResult, calendarEventResult] = await Promise.all([
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
      ...meetings.map((meeting) => ({
        id: `meeting-${meeting.id}`,
        date: meeting.meeting_date,
        title: meeting.title,
        label: "會議",
        kind: "meeting" as const,
        projectId: meeting.project_id ?? undefined,
        meetingId: meeting.id,
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
  }, [calendarEvents, calendarMonth, meetings, projects, tasks]);

  function shiftCalendarMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openCalendarEvent(event: CalendarEvent) {
    if (event.meetingId) {
      const meeting = meetings.find((item) => item.id === event.meetingId);
      if (meeting) void openMeetingDetail(meeting);
      return;
    }

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

  async function openMeetingDetail(meeting: MeetingSummary) {
    if (!supabase) return;
    setSelectedProjectId(null);
    setSelectedMeetingId(meeting.id);
    setMeetingDetailLoading(true);
    const decisionsResult = await supabase
      .from("meeting_decisions")
      .select("id,meeting_id,decision,created_at")
      .eq("meeting_id", meeting.id)
      .order("created_at");
    setMeetingDetailLoading(false);
    setMeetingDetail({
      meeting,
      decisions: (decisionsResult.data ?? []) as MeetingDecision[],
    });
    if (meeting.notes_doc_url) {
      void importMeetingDoc(meeting);
    }
  }

  async function addMeeting() {
    if (!supabase || !newMeeting.title || !newMeeting.meeting_date) return;
    setSaveMessage("新增中...");
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title: newMeeting.title,
        meeting_date: newMeeting.meeting_date,
        summary: null,
        notes: newMeeting.notes || null,
        notes_doc_url: newMeeting.notes_doc_url || null,
      })
      .select("id,project_id,title,meeting_date,summary,notes,google_meet_url,notes_doc_url")
      .single();
    if (error) { setSaveMessage("新增失敗。"); return; }
    const createdMeeting = data as MeetingSummary;
    setMeetings((prev) => [createdMeeting, ...prev]);
    setNewMeeting({ title: "", meeting_date: "", notes: "", notes_doc_url: "" });
    setIsAddingMeeting(false);
    if (createdMeeting.notes_doc_url) {
      const importedMeeting = await importMeetingDoc(createdMeeting);
      if (importedMeeting) setSaveMessage("已新增並從 Google Doc 匯入完整內容。");
      return;
    }
    setSaveMessage("已新增會議記錄。");
  }

  async function deleteMeeting(id: string) {
    if (!supabase) return;
    if (!window.confirm("確定要刪除此會議記錄？此操作無法復原。")) return;
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) { setSaveMessage("刪除失敗。"); return; }
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (meetingDetail?.meeting.id === id) setMeetingDetail(null);
    if (selectedMeetingId === id) setSelectedMeetingId(null);
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
      setSaveMessage("新增公告失敗，請確認你有管理員權限。");
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
      setSaveMessage("刪除公告失敗，請確認你有管理員權限。");
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

  function startEdit(kind: EditKind, item: { id: string } & object) {
    const values = Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, value == null ? "" : String(value)]),
    );
    setSaveMessage("");
    setEditing({ kind, id: String(item.id), values });
  }

  function startMeetingEdit(meeting: MeetingSummary) {
    setMeetingDetail((current) =>
      current?.meeting.id === meeting.id ? current : { meeting, decisions: [] },
    );
    startEdit("meeting", meeting);
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
    if (!supabase || !editing || !session?.access_token) return;

    setSaveMessage("儲存中...");
    const { kind, id, values } = editing;
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
          "id,name,slug,description,status,start_date,expected_end_date,google_drive_folder_url,drive_folder_label,drive_folder_purpose,updated_at",
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
        if (updatedMeeting.notes_doc_url) {
          const importedMeeting = await importMeetingDoc(updatedMeeting);
          if (importedMeeting) setSaveMessage("已更新並從 Google Doc 匯入完整內容。");
          return;
        }
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
    const active = isEditing("meeting", meeting.id);

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
  const selectedProjectMeetings = selectedProject
    ? meetings.filter((meeting) => meeting.project_id === selectedProject.id)
    : [];
  const selectedMeeting =
    selectedMeetingId && meetingDetail?.meeting.id === selectedMeetingId
      ? meetingDetail.meeting
      : meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null;
  const selectedMeetingProject = selectedMeeting?.project_id
    ? projects.find((project) => project.id === selectedMeeting.project_id) ?? null
    : null;
  const selectedMeetingDecisions =
    selectedMeetingId && meetingDetail?.meeting.id === selectedMeetingId ? meetingDetail.decisions : [];
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

          {isEditing("meeting", selectedMeeting.id) ? (
            <section className="panel">
              <div className="edit-grid">
                {editInput("title", "會議標題")}
                {editInput("meeting_date", "會議日期", "date")}
                {editInput("google_meet_url", "Google Meet 連結")}
                {editInput("notes_doc_url", "Google Doc 連結")}
                {editTextarea("notes", "完整會議內容")}
              </div>
            </section>
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
            {meetingDetailLoading ? (
              <p className="empty">載入中...</p>
            ) : selectedMeeting.notes || selectedMeetingDecisions.length > 0 ? (
              <div className="meeting-original-content">
                {selectedMeeting.notes ? <pre className="meeting-notes meeting-notes--full">{selectedMeeting.notes}</pre> : null}
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
              <p>{selectedProject.description ?? "尚未填寫專案說明。"}</p>
            </div>
            <div className="row-actions">
              {selectedProject.google_drive_folder_url ? (
                <a href={selectedProject.google_drive_folder_url} target="_blank" rel="noreferrer" title="開啟雲端硬碟資料夾">
                  <ExternalLink size={16} />
                </a>
              ) : null}
              {editActions("project", selectedProject)}
            </div>
          </div>

          {isEditing("project", selectedProject.id) ? (
            <section className="panel">
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
            </section>
          ) : null}

          <section className="project-detail-grid">
            <article className="detail-card">
              <span>狀態</span>
              <strong>{labelFromMap(projectStatusLabels, selectedProject.status)}</strong>
            </article>
            <article className="detail-card">
              <span>開始時間</span>
              <strong>{selectedProject.start_date ?? "未設定"}</strong>
            </article>
            <article className="detail-card">
              <span>期望結束</span>
              <strong>{selectedProject.expected_end_date ?? "未設定"}</strong>
            </article>
            <article className="detail-card">
              <span>任務數</span>
              <strong>{selectedProjectTasks.length}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <FolderKanban size={18} />
              <h2>專案資料</h2>
            </div>
            <div className="detail-list">
              <div>
                <span>英文代碼</span>
                <strong>{selectedProject.slug}</strong>
              </div>
              <div>
                <span>Drive 資料夾</span>
                <strong>{selectedProject.drive_folder_label ?? "未設定"}</strong>
              </div>
              <div>
                <span>Drive 用途</span>
                <p>{selectedProject.drive_folder_purpose ?? "未設定"}</p>
              </div>
              <div>
                <span>最後更新</span>
                <strong>{new Date(selectedProject.updated_at).toLocaleString("zh-TW")}</strong>
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

          <section className="panel">
            <div className="panel-heading">
              <CalendarDays size={18} />
              <h2>關聯會議</h2>
            </div>
            <div className="list">
              {selectedProjectMeetings.map((meeting) => (
                <article className="list-row" key={meeting.id}>
                  <button className="project-title-button" type="button" onClick={() => openMeetingDetail(meeting)}>
                    <strong>{meeting.title}</strong>
                    <span>{meeting.meeting_date}</span>
                    <ChevronDown size={16} />
                  </button>
                  <div className="row-actions">
                    {meeting.google_meet_url ? (
                      <a href={meeting.google_meet_url} target="_blank" rel="noreferrer" title="開啟 Google Meet">
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                    {meeting.notes_doc_url ? (
                      <a href={meeting.notes_doc_url} target="_blank" rel="noreferrer" title="開啟 Google Doc">
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
              {selectedProjectMeetings.length === 0 ? <p className="empty">此專案尚未連結會議。</p> : null}
            </div>
          </section>
        </section>
      </main>
    );
  }

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
            <button className="btn-add panel-action" type="button" onClick={() => setIsAddingMeeting((v) => !v)}>
              <Plus size={14} /> 新增會議記錄
            </button>
          </div>

          {isAddingMeeting ? (
            <div className="add-meeting-form">
              <div className="edit-grid">
                <label>
                  會議標題
                  <input
                    type="text"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting((v) => ({ ...v, title: e.target.value }))}
                    placeholder="例：AI委員會第三次技術會議"
                  />
                </label>
                <label>
                  會議日期
                  <input
                    type="date"
                    value={newMeeting.meeting_date}
                    onChange={(e) => setNewMeeting((v) => ({ ...v, meeting_date: e.target.value }))}
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  完整會議內容（選填）
                  <textarea
                    value={newMeeting.notes}
                    onChange={(e) => setNewMeeting((v) => ({ ...v, notes: e.target.value }))}
                    placeholder="輸入完整會議記錄，或貼上 Google Doc 連結後匯入"
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  Google Doc 連結（選填）
                  <input
                    type="url"
                    value={newMeeting.notes_doc_url}
                    onChange={(e) => setNewMeeting((v) => ({ ...v, notes_doc_url: e.target.value }))}
                    placeholder="https://docs.google.com/document/..."
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={addMeeting}>新增</button>
                <button type="button" onClick={() => { setIsAddingMeeting(false); setNewMeeting({ title: "", meeting_date: "", notes: "", notes_doc_url: "" }); }}>取消</button>
              </div>
            </div>
          ) : null}

          <div className="list">
            {meetings.map((meeting) => (
              <article className="list-row--meeting" key={meeting.id}>
                <button
                  className="meeting-row-header"
                  type="button"
                  onClick={() => openMeetingDetail(meeting)}
                >
                  <div className="meeting-row-meta">
                    <span className="meeting-title">{meeting.title}</span>
                    <span className="meeting-date">{meeting.meeting_date}</span>
                    {meeting.notes ? <pre className="meeting-notes meeting-notes--preview">{meeting.notes}</pre> : null}
                  </div>
                  <div className="row-actions">
                    {meeting.google_meet_url ? (
                      <a href={meeting.google_meet_url} target="_blank" rel="noreferrer" title="開啟 Google Meet" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                    {meeting.notes_doc_url ? (
                      <a href={meeting.notes_doc_url} target="_blank" rel="noreferrer" title="開啟 Google Doc" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                    <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                  </div>
                </button>
              </article>
            ))}
            {meetings.length === 0 && loadState !== "loading" ? <p className="empty">目前沒有會議紀錄。</p> : null}
          </div>
        </div>

      </section>
    </main>
  );
}

export default App;
