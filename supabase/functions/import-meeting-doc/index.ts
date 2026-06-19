import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ImportRequest = {
  meetingId?: string;
  url?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractGoogleDocCandidates(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.hostname !== "docs.google.com") {
    throw new Error("Only Google Docs URLs are supported.");
  }

  const resourceKey = url.searchParams.get("resourcekey");
  const suffix = resourceKey ? `&resourcekey=${encodeURIComponent(resourceKey)}` : "";
  const standardMatch = url.pathname.match(/\/document\/(?:u\/\d+\/)?d\/([^/]+)/);
  const publishedMatch = url.pathname.match(/\/document\/d\/e\/([^/]+)/);
  const candidates: string[] = [];

  if (standardMatch?.[1]) {
    candidates.push(`https://docs.google.com/document/d/${standardMatch[1]}/export?format=txt${suffix}`);
  }
  if (publishedMatch?.[1]) {
    candidates.push(`https://docs.google.com/document/d/e/${publishedMatch[1]}/pub?output=txt`);
  }

  if (candidates.length === 0) {
    throw new Error("Could not find a Google Doc id in the URL.");
  }

  return candidates;
}

function cleanText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const { meetingId, url } = (await req.json()) as ImportRequest;
    if (!meetingId || !url) {
      return jsonResponse({ error: "meetingId and url are required." }, 400);
    }

    const candidates = extractGoogleDocCandidates(url);
    let rawText = "";
    let lastStatus = 0;

    for (const candidate of candidates) {
      const response = await fetch(candidate, {
        redirect: "follow",
        headers: {
          "User-Agent": "rotary-ai-platform/1.0",
        },
      });
      lastStatus = response.status;
      if (response.ok) {
        rawText = await response.text();
        break;
      }
    }

    const notes = cleanText(rawText);
    if (!notes) {
      return jsonResponse(
        {
          error: "Google Doc could not be imported. Share it with anyone who has the link, or publish it to the web.",
          status: lastStatus,
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Supabase environment is not configured." }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const { data, error } = await supabase
      .from("meetings")
      .update({
        notes,
        summary: null,
        notes_doc_url: url,
      })
      .eq("id", meetingId)
      .select("id,project_id,title,meeting_date,summary,notes,google_meet_url,notes_doc_url")
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 403);
    }

    return jsonResponse({ meeting: data });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 400);
  }
});
