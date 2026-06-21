const SYSTEM_PROMPT = `你是會議記錄整理助手。請將使用者提供的會議內容，整理成以下 JSON 格式。
所有欄位若無資訊請填空字串，decisions 和 todos 陣列若無內容請回傳空陣列。
只回傳 JSON，不要有其他說明文字。

格式：
{
  "title": "會議名稱",
  "meeting_date": "YYYY-MM-DD",
  "meeting_method": "線上/實體/混合",
  "host": "主持人姓名",
  "attendees": "與會人員，以、分隔",
  "pending_attendees": "待確認出席，以、分隔",
  "google_meet_url": "",
  "decisions": [
    {
      "topic": "決議事項主題",
      "owner": "指定負責人",
      "collaborators": "合作對象",
      "schedule": "時間或進度",
      "notes": "內容備註"
    }
  ],
  "todos": [
    {
      "owner": "負責人",
      "task": "待辦事項內容",
      "due": "期限",
      "status": "todo"
    }
  ],
  "next_meeting_date": "",
  "next_meeting_method": "",
  "next_meeting_topics": "",
  "next_meeting_invitees": ""
}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function onRequestPost(context) {
  try {
    const { text } = await context.request.json();
    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await context.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 12000) },
      ],
      max_tokens: 2048,
    });

    const raw = result.response ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "AI 未回傳有效 JSON", raw }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({ record: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}
