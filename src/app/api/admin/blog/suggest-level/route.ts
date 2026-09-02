import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { isPostLevel } from "@/lib/blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Strip HTML tags to plain text and cap length for the prompt. */
function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

/**
 * POST /api/admin/blog/suggest-level — ask Gemini to classify a post's topic
 * difficulty (beginner / intermediate / advanced) from its title + body. The
 * author reviews the suggestion before saving; nothing is persisted here.
 */
export const POST = withAdmin(async (req) => {
  const body = (await req.json().catch(() => ({}))) as { title?: string; contentHtml?: string };
  const title = (body.title ?? "").trim();
  const text = toText(body.contentHtml ?? "");
  if (!title && !text) throw new AdminError(400, "Nothing to analyze yet");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AdminError(500, "GEMINI_API_KEY not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  const prompt =
    `You classify the topic difficulty of an astrophotography blog post for a telescope-rental site. ` +
    `Judge the SUBJECT MATTER's technical demand for the reader, not the writing quality.\n` +
    `- "beginner": accessible to someone new to astrophotography, little jargon assumed.\n` +
    `- "intermediate": assumes some hands-on familiarity (framing, basic processing, gear terms).\n` +
    `- "advanced": deep technical detail (calibration math, guiding tuning, narrowband workflows).\n` +
    `Return JSON: level (one of beginner|intermediate|advanced) and reason (one short sentence).\n\n` +
    `TITLE: ${title}\n\nCONTENT: ${text}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                reason: { type: "string" },
              },
              required: ["level"],
            },
          },
        }),
      },
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new AdminError(502, data?.error?.message ?? "No suggestion returned");

    const parsed = JSON.parse(raw) as { level?: string; reason?: string };
    if (!isPostLevel(parsed.level)) throw new AdminError(502, "Model returned an invalid level");

    return NextResponse.json({
      level: parsed.level,
      reason: typeof parsed.reason === "string" ? parsed.reason.replace(/\s+/g, " ").trim().slice(0, 200) : "",
    });
  } catch (e) {
    if (e instanceof AdminError) throw e;
    throw new AdminError(502, e instanceof Error ? e.message : "Gemini request failed");
  }
}, "blog.manage");
