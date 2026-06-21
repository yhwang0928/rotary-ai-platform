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

type ExportCandidate = {
  format: "html" | "text";
  url: string;
};

const formattedNotesPrefix = "<!-- rotary-meeting-html-v1 -->";
const allowedTags = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "col",
  "colgroup",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);
const voidTags = new Set(["br", "col", "hr"]);
const allowedAttrsByTag: Record<string, Set<string>> = {
  a: new Set(["href"]),
  col: new Set(["span"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
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

function appendCacheBuster(candidate: string) {
  const url = new URL(candidate);
  url.searchParams.set("_sync", String(Date.now()));
  return url.toString();
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
  const candidates: ExportCandidate[] = [];

  if (standardMatch?.[1]) {
    candidates.push({
      format: "html",
      url: `https://docs.google.com/document/d/${standardMatch[1]}/export?format=html${suffix}`,
    });
    candidates.push({
      format: "text",
      url: `https://docs.google.com/document/d/${standardMatch[1]}/export?format=txt${suffix}`,
    });
  }
  if (publishedMatch?.[1]) {
    candidates.push({
      format: "html",
      url: `https://docs.google.com/document/d/e/${publishedMatch[1]}/pub?output=html`,
    });
    candidates.push({
      format: "text",
      url: `https://docs.google.com/document/d/e/${publishedMatch[1]}/pub?output=txt`,
    });
  }

  if (candidates.length === 0) {
    throw new Error("Could not find a Google Doc id in the URL.");
  }

  return candidates;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeTag(rawTag: string) {
  const trimmed = rawTag.trim();
  const isClosing = trimmed.startsWith("/");
  const isSelfClosing = trimmed.endsWith("/");
  const nameMatch = trimmed.match(/^\/?\s*([a-zA-Z0-9:-]+)/);
  const name = nameMatch?.[1]?.toLowerCase();

  return { isClosing, isSelfClosing, name, trimmed };
}

function sanitizeAttributes(tagName: string, rawAttributes: string) {
  const allowedAttrs = allowedAttrsByTag[tagName];
  if (!allowedAttrs) return "";

  const attrs: string[] = [];
  for (const match of rawAttributes.matchAll(/([a-zA-Z0-9:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>/]+))?/g)) {
    const name = match[1].toLowerCase();
    if (!allowedAttrs.has(name)) continue;

    const rawValue = match[2] ?? "";
    const decodedValue = decodeEntities(rawValue.replace(/^['"]|['"]$/g, "")).trim();
    if (name === "href" && !/^https?:\/\//i.test(decodedValue)) continue;
    if ((name === "colspan" || name === "rowspan" || name === "span") && !/^[1-9]\d{0,2}$/.test(decodedValue)) continue;
    if (name === "scope" && !/^(col|row|colgroup|rowgroup)$/i.test(decodedValue)) continue;

    attrs.push(`${name}="${escapeHtml(decodedValue)}"`);
  }

  if (tagName === "a") {
    attrs.push('target="_blank"', 'rel="noreferrer"');
  }

  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}

function sanitizeHtml(value: string) {
  const withoutUnsafeBlocks = value
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "");
  const bodyMatch = withoutUnsafeBlocks.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? withoutUnsafeBlocks;
  const normalizedBreaks = bodyHtml
    .replace(/<p[^>]*>\s*<\/p>/gi, "<p><br></p>")
    .replace(/<span[^>]*>\s*<\/span>/gi, "");

  const sanitized = normalizedBreaks.replace(/<([^>]+)>/g, (match, rawTag) => {
    const { isClosing, isSelfClosing, name, trimmed } = normalizeTag(rawTag);
    if (!name || !allowedTags.has(name)) return "";
    if (isClosing) return voidTags.has(name) ? "" : `</${name}>`;

    const attrText = trimmed
      .replace(new RegExp(`^${name}`, "i"), "")
      .replace(/\/$/, "");
    const attrs = sanitizeAttributes(name, attrText);
    return voidTags.has(name) || isSelfClosing ? `<${name}${attrs}>` : `<${name}${attrs}>`;
  });

  return sanitized
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    let importedNotes = "";
    let lastStatus = 0;

    for (const candidate of candidates) {
      const response = await fetch(appendCacheBuster(candidate.url), {
        redirect: "follow",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "User-Agent": "rotary-ai-platform/1.0",
        },
      });
      lastStatus = response.status;
      if (response.ok) {
        const body = await response.text();
        importedNotes = candidate.format === "html"
          ? `${formattedNotesPrefix}\n${sanitizeHtml(body)}`
          : cleanText(body);
        break;
      }
    }

    if (!importedNotes) {
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
        notes: importedNotes,
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
