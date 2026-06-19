export type TaskStatus =
  | "backlog"
  | "todo"
  | "doing"
  | "review"
  | "done"
  | "blocked"
  | "cancelled";

export type Priority = "p0" | "p1" | "p2" | "p3";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  google_drive_folder_url: string | null;
  updated_at: string;
}

export interface TaskSummary {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  start_date: string | null;
  blocker_reason: string | null;
}

export interface MeetingSummary {
  id: string;
  project_id: string | null;
  title: string;
  meeting_date: string;
  google_meet_url: string | null;
}

export interface RequirementSummary {
  id: string;
  project_id: string | null;
  module: string;
  title: string;
  status: string;
  priority: Priority;
  updated_at: string;
}
