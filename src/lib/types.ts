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
  owner_names: string | null;
  project_purpose: string | null;
  project_background: string | null;
  participating_units: string | null;
  budget_range: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  google_drive_folder_url: string | null;
  drive_folder_label: string | null;
  drive_folder_purpose: string | null;
  updated_at: string;
}

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
}

export interface CalendarEventSummary {
  id: string;
  project_id: string | null;
  title: string;
  event_date: string;
  description: string | null;
  location: string | null;
  url: string | null;
  created_at: string;
}

export interface TaskSummary {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  start_date: string | null;
  completed_date: string | null;
  blocker_reason: string | null;
  owner_names: string | null;
  collaborator_names: string | null;
  output_title: string | null;
}

export interface MeetingSummary {
  id: string;
  project_id: string | null;
  title: string;
  meeting_date: string;
  summary: string | null;
  notes: string | null;
  google_meet_url: string | null;
  notes_doc_url: string | null;
}

export interface ActionItemSummary {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  owner_names: string | null;
  collaborator_names: string | null;
}

export interface MeetingDecision {
  id: string;
  meeting_id: string;
  decision: string;
  created_at: string;
}

export interface MeetingDetail {
  meeting: MeetingSummary;
  decisions: MeetingDecision[];
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
