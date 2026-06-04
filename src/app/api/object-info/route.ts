import { NextResponse } from "next/server";

/**
 * AI-generated, beginner-friendly description of a deep-sky object.
 * Runs server-side so the Gemini key never reaches the browser.
 * Results are cached in memory per object name for the server's lifetime.
 */
export const runtime = "nodejs";

type ObjectInfo = {
  description: string;
  constellation: string | null;
  objectType: string | null;
  magnitude: number | null;
};

const cache = new Map<string, ObjectInfo>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim();
  const ctx = url.searchParams.get("ctx")?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });

  const cacheKey = `${name}|${ctx}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  const prompt =
    `You are an astronomy guide for a telescope-rental website. Describe the deep-sky object "${name}"` +
    (ctx ? ` (${ctx})` : "") +
    `. Write for a curious beginner: factual, engaging, and brief.\n` +
    `Return JSON with keys: description (1-2 sentences, no markdown), constellation, objectType ` +
    `(e.g. "Emission nebula", "Spiral galaxy", "Globular cluster"), magnitude (apparent visual, number). ` +
    `Use null for any field you are not confident about. Never invent precise figures.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            // Disable "thinking" so the 2.5 models don't spend the output budget
            // reasoning and truncate the JSON.
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                description: { type: "string" },
                constellation: { type: "string", nullable: true },
                objectType: { type: "string", nullable: true },
                magnitude: { type: "number", nullable: true },
              },
              required: ["description"],
            },
          },
        }),
      },
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "no content", detail: data?.error?.message ?? null },
        { status: 502 },
      );
    }

    let parsed: ObjectInfo;
    try {
      parsed = JSON.parse(text) as ObjectInfo;
    } catch {
      // Salvage a truncated/edge-case response: pull the description string out.
      const m = text.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (!m) throw new Error("could not parse model JSON");
      parsed = { description: JSON.parse(`"${m[1]}"`), constellation: null, objectType: null, magnitude: null };
    }
    // Sanitize: the model sometimes pads strings with stray whitespace/newlines.
    const clean = (s: string | null | undefined) => {
      if (!s) return null;
      const t = s.replace(/\s+/g, " ").trim();
      return t.length ? t.slice(0, 280) : null;
    };
    parsed = {
      description: clean(parsed.description) ?? "",
      constellation: clean(parsed.constellation),
      objectType: clean(parsed.objectType),
      magnitude: typeof parsed.magnitude === "number" ? parsed.magnitude : null,
    };

    cache.set(cacheKey, parsed);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: "gemini request failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
