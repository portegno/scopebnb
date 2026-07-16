/**
 * The AI narrative layer. Takes the ALREADY-EXTRACTED facts (numbers) plus the
 * deterministic assessment flags and asks Gemini to phrase them — as the "how
 * it went" cards and Mike's first-person recap of the client's night.
 *
 * Hard rule: the model only PHRASES facts it is given. Every number comes from
 * the parser/assessor; the model must not invent metrics. Same Gemini setup as
 * /api/capture-plan (server-side key, JSON responseSchema, low temperature).
 */
import type { SessionReport, SessionNarrative } from "./report";
import { assessSession } from "./assess";

/** Compact fact sheet handed to the model — no prose, just the numbers/flags. */
function factSheet(r: SessionReport): string {
  const flags = assessSession(r)
    .map((f) => `- ${f.label} [${f.tier}]: ${f.summary}`)
    .join("\n");
  return [
    `Target: ${r.target.name}${r.target.catalog ? ` (${r.target.catalog})` : ""}`,
    `Date: ${r.date}, imaged ${r.sessionStart}–${r.sessionEnd} local (${r.durationHours}h on site)`,
    `Windows: ${r.windows.map((w) => `${w.start}-${w.end} (${w.frames} frames)`).join(", ")}`,
    `Capture: ${r.capture.frames} lights x ${r.capture.subSeconds}s through ${r.capture.filter}${r.capture.filterDetail ? ` (${r.capture.filterDetail})` : ""} = ${r.capture.integration} total`,
    `Sensor: gain ${r.capture.gain}, offset ${r.capture.offset}, ${r.capture.sensorTempC}C`,
    `Delivery: ${r.delivery.lights} lights + calibration frames${r.delivery.integratedImage ? " + integrated image" : " (integration is a paid add-on, not included)"}`,
    `Site: Starfront Observatories, Rockwood TX, Bortle 1`,
    ``,
    `Assessment flags (tier is the verdict, already decided — do not re-judge):`,
    flags,
  ].join("\n");
}

function buildPrompt(r: SessionReport): string {
  return (
    `You are Mike, the on-site astrophotography expert and host at ScopeBnB, a remote ` +
    `telescope rental under Bortle 1 skies in Texas. A client booked a managed imaging night ` +
    `and you are writing up how it went, for THEM to read. You are warm, encouraging and precise; ` +
    `you talk to a fellow enthusiast, never condescending, never salesy.\n\n` +
    `Here are the FACTS of the night (already measured — treat as ground truth):\n\n` +
    factSheet(r) +
    `\n\nWrite two things:\n` +
    `1) "howItWent": 3 short cards, each a {title, body}. Title is 2-4 words. Body is 1-2 sentences ` +
    `of plain language explaining one dimension of the night (e.g. focus/seeing, guiding/tracking, ` +
    `the Moon and sky, or what they collected). Ground every statement in the facts above.\n` +
    `2) "mikeRecap": your first-person recap to the client, 3-5 sentences. Speak as Mike ("I", "we"). ` +
    `Be specific to THIS night and target. Set the scene, say honestly how conditions were, and end ` +
    `on what they are taking home.\n\n` +
    `Rules: Use ONLY the numbers given above — never invent or alter a figure. Write in English. ` +
    `Do NOT use em dashes or en dashes anywhere. Keep it concrete, not generic.`
  );
}

/**
 * Generate Mike's narrative for a session. Server-side only (needs the Gemini
 * key). Throws on missing key or a failed/blocked response so callers can fall
 * back to no narrative rather than ship a broken one.
 */
export async function generateNarrative(r: SessionReport): Promise<SessionNarrative> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(r) }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              howItWent: {
                type: "array",
                items: {
                  type: "object",
                  properties: { title: { type: "string" }, body: { type: "string" } },
                  required: ["title", "body"],
                },
              },
              mikeRecap: { type: "string" },
            },
            required: ["howItWent", "mikeRecap"],
          },
        },
      }),
    },
  );

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(data?.error?.message ?? "no content from model");

  const raw = JSON.parse(text) as SessionNarrative;

  // Strip any dashes the model slipped in (ScopeBnB copy rule: no em/en dashes).
  const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
  return {
    howItWent: (raw.howItWent ?? [])
      .slice(0, 3)
      .map((c) => ({ title: clean(c.title), body: clean(c.body) })),
    mikeRecap: clean(raw.mikeRecap ?? ""),
  };
}
