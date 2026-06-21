from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


SOURCE_DIR = Path("/Users/yikaihuang/Desktop/2627 AI委員會")
OUT_SQL = Path("supabase/seed/meeting_records_docx_structured.sql")
FORMATTED_PREFIX = "<!-- rotary-meeting-html-v1 -->"
STRUCTURED_PREFIX = "<!-- rotary-structured-meeting-v1 -->"

MEETINGS = [
    {
        "id": "11111111-0509-0000-0000-000000000001",
        "date": "2026-05-09",
        "title": "AI委員會第一次技術會議",
        "file": "AI委員會第一次技術會議紀錄0509.docx",
    },
    {
        "id": "11111111-0516-0000-0000-000000000002",
        "date": "2026-05-16",
        "title": "AI委員會第二次技術會議",
        "file": "AI委員會第二次技術會議紀錄0516.docx",
    },
    {
        "id": "11111111-0606-0000-0000-000000000003",
        "date": "2026-06-06",
        "title": "AI委員會第三次技術會議",
        "file": "AI委員會第三次技術會議紀錄0606.docx",
    },
    {
        "id": "11111111-0620-0000-0000-000000000004",
        "date": "2026-06-20",
        "title": "AI委員會第四次技術會議",
        "file": "AI委員會第四次技術會議紀錄0620.docx",
    },
]


@dataclass
class Decision:
    topic: str
    owner: str = ""
    collaborators: str = ""
    schedule: str = ""
    notes: list[str] = field(default_factory=list)


@dataclass
class Todo:
    owner: str
    task: str
    due: str
    status: str = "進行中"


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u3000", " ")).strip()


def html_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def dollar_quote(value: str, tag: str) -> str:
    while f"${tag}$" in value:
        tag = f"{tag}_x"
    return f"${tag}${value}${tag}$"


def iter_blocks(doc: Document):
    body = doc.element.body
    for child in body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, doc)
        elif child.tag.endswith("}tbl"):
            yield Table(child, doc)


def table_rows(table: Table) -> list[list[str]]:
    rows: list[list[str]] = []
    for row in table.rows:
        cells = [clean(cell.text) for cell in row.cells]
        deduped: list[str] = []
        for cell in cells:
            if not deduped or deduped[-1] != cell:
                deduped.append(cell)
        rows.append(deduped)
    return rows


def kv_table(rows: list[list[str]]) -> dict[str, str]:
    data: dict[str, str] = {}
    for row in rows:
        if len(row) < 2:
            continue
        key = clean(row[0])
        value = clean(" ".join(row[1:]))
        if key and key not in {"項目", "負責人"}:
            data[key] = value
    return data


def normalize_date_text(value: str, fallback: str) -> str:
    if re.search(r"\d{4}\D+\d{1,2}\D+\d{1,2}", value):
        m = re.search(r"(\d{4})\D+(\d{1,2})\D+(\d{1,2})", value)
        if m:
            return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    return fallback


def parse_topic(text: str) -> str | None:
    text = clean(text)
    if text.startswith("決議"):
        return re.sub(r"^決議[一二三四五六七八九十\d]+[｜|、:\s]*", "", text).strip() or text
    if text.startswith("案由"):
        return re.sub(r"^案由[一二三四五六七八九十\d]+[：:\s]*", "", text).strip() or text
    return None


def is_section_heading(text: str) -> bool:
    return bool(re.match(r"^[一二三四五六七八九十]、", clean(text)))


def is_bracket_heading(text: str) -> bool:
    return clean(text) in {"【說明】", "【討論重點】", "【執行事項】"}


def append_decision_table(decision: Decision, rows: list[list[str]]) -> None:
    data = kv_table(rows)
    owner = data.get("指定負責人") or data.get("負責人")
    if owner:
        decision.owner = owner
    collaborators = data.get("合作對象") or data.get("技術協助") or data.get("資源／測試組")
    if collaborators:
        decision.collaborators = collaborators
    schedule = data.get("時間／進度") or data.get("活動時間") or data.get("開始時間") or data.get("階段目標") or data.get("目前進度")
    if schedule:
        decision.schedule = schedule

    extra = []
    for key, value in data.items():
        if key not in {"指定負責人", "負責人", "合作對象", "技術協助", "資源／測試組", "時間／進度", "活動時間", "開始時間", "階段目標", "目前進度"}:
            extra.append(f"{key}：{value}")
    if extra:
        decision.notes.extend(extra)


def append_todos(rows: list[list[str]], todos: list[Todo]) -> bool:
    if not rows:
        return False
    header = rows[0]
    joined = " ".join(header)
    if "負責人" not in joined or not any(label in joined for label in ["待辦事項", "執行內容"]):
        return False
    for row in rows[1:]:
        if len(row) >= 3 and any(row):
            todos.append(Todo(owner=row[0], task=row[1], due=row[2]))
    return True


def parse_docx(path: Path, fallback: dict[str, str]) -> dict[str, Any]:
    doc = Document(path)
    info: dict[str, str] = {}
    decisions: list[Decision] = []
    todos: list[Todo] = []
    next_meeting: dict[str, str] = {}
    current: Decision | None = None
    mode = ""
    first_table_seen = False

    for block in iter_blocks(doc):
        if isinstance(block, Paragraph):
            text = clean(block.text)
            if not text:
                continue
            topic = parse_topic(text)
            if topic:
                current = Decision(topic=topic)
                decisions.append(current)
                mode = "decision"
                continue
            if "下次會議" in text:
                mode = "next"
                current = None
                continue
            if is_section_heading(text) or is_bracket_heading(text):
                continue
            if current:
                current.notes.append(text)
            continue

        rows = table_rows(block)
        if not first_table_seen:
            raw_info = kv_table(rows)
            info = {
                "會議名稱": raw_info.get("會議名稱", fallback["title"]),
                "會議時間": normalize_date_text(raw_info.get("會議時間", ""), fallback["date"]),
                "會議方式": raw_info.get("會議方式", raw_info.get("地 點", raw_info.get("地點", ""))),
                "主持人": raw_info.get("主持人", raw_info.get("主 席", raw_info.get("主席", ""))),
                "與會人員": raw_info.get("與會人員", raw_info.get("出席人員", "")),
                "待確認出席": raw_info.get("待確認出席", ""),
            }
            first_table_seen = True
            continue

        if append_todos(rows, todos):
            continue

        if mode == "next":
            next_meeting = kv_table(rows)
            continue

        if current and len(rows) == 1 and len(rows[0]) == 1:
            current.notes.append(rows[0][0])
            continue

        if current and rows:
            append_decision_table(current, rows)

    return {
        "title": fallback["title"],
        "meeting_date": fallback["date"],
        "info": info,
        "decisions": decisions,
        "todos": todos,
        "next": next_meeting,
    }


def table_html(rows: list[tuple[str, str]]) -> str:
    body = []
    for label, value in rows:
        if value:
            body.append(
                f"<tr><th scope=\"row\">{html_escape(label)}</th><td>{html_escape(value).replace(chr(10), '<br>')}</td></tr>"
            )
    return "".join(body)


def build_structured_html(record: dict[str, Any]) -> str:
    info = record["info"]
    decisions: list[Decision] = record["decisions"]
    todos: list[Todo] = record["todos"]
    next_meeting = record["next"]

    info_rows = table_html([
        ("會議名稱", info.get("會議名稱") or record["title"]),
        ("會議時間", info.get("會議時間") or record["meeting_date"]),
        ("會議方式", info.get("會議方式", "")),
        ("主持人", info.get("主持人", "")),
        ("與會人員", info.get("與會人員", "")),
        ("待確認出席", info.get("待確認出席", "")),
    ])

    decision_html = []
    for index, decision in enumerate(decisions, start=1):
        rows = table_html([
            ("指定負責人", decision.owner),
            ("合作對象", decision.collaborators),
            ("時間／進度", decision.schedule),
            ("內容", "\n".join(decision.notes)),
        ])
        decision_html.append(
            f"<h3>決議{index}｜{html_escape(decision.topic or '未命名事項')}</h3><table><tbody>{rows}</tbody></table>"
        )

    todo_html = "".join(
        f"<tr><td>{html_escape(todo.owner)}</td><td>{html_escape(todo.task)}</td><td>{html_escape(todo.due)}</td><td>{html_escape(todo.status)}</td></tr>"
        for todo in todos
    )

    next_rows = table_html([
        ("時間", next_meeting.get("時間", "")),
        ("方式", next_meeting.get("方式", "")),
        ("主要議題", next_meeting.get("主要議題", "")),
        ("需邀請人員", next_meeting.get("需邀請人員", "")),
    ])

    parts = [
        f"<h1>{html_escape(record['title'])}</h1>",
        f"<h2>一、會議資訊</h2><table><tbody>{info_rows}</tbody></table>",
        f"<h2>二、會議決議</h2>{''.join(decision_html)}" if decision_html else "",
        f"<h2>三、待辦事項 To Do</h2><table><thead><tr><th>負責人</th><th>待辦事項</th><th>期限</th><th>狀態</th></tr></thead><tbody>{todo_html}</tbody></table>" if todo_html else "",
        f"<h2>四、下次會議</h2><table><tbody>{next_rows}</tbody></table>" if next_rows else "",
    ]
    return "\n".join(part for part in parts if part)


def main() -> None:
    rows = []
    for meeting in MEETINGS:
        parsed = parse_docx(SOURCE_DIR / meeting["file"], meeting)
        structured_html = build_structured_html(parsed)
        notes = f"{FORMATTED_PREFIX}\n{STRUCTURED_PREFIX}\n{structured_html}"
        tag = meeting["date"].replace("-", "")
        rows.append(
            "  ("
            f"'{meeting['id']}'::uuid, "
            "null, "
            f"{dollar_quote(meeting['title'], 'title_' + tag)}, "
            f"'{meeting['date']}'::date, "
            "null, "
            f"{dollar_quote(notes, 'notes_' + tag)}, "
            "null, "
            "null"
            ")"
        )

    sql = f"""-- ============================================================
-- 由原始 DOCX 會議記錄解析成系統表單可編輯格式。
-- 來源：/Users/yikaihuang/Desktop/2627 AI委員會
-- 執行方式：貼到 Supabase SQL Editor -> Run
-- ============================================================

insert into public.meetings (
  id,
  project_id,
  title,
  meeting_date,
  summary,
  notes,
  google_meet_url,
  notes_doc_url
)
values
{",\n".join(rows)}
on conflict (id) do update
set
  project_id = excluded.project_id,
  title = excluded.title,
  meeting_date = excluded.meeting_date,
  summary = excluded.summary,
  notes = excluded.notes,
  google_meet_url = excluded.google_meet_url,
  notes_doc_url = excluded.notes_doc_url;
"""
    OUT_SQL.write_text(sql, encoding="utf-8")


if __name__ == "__main__":
    main()
