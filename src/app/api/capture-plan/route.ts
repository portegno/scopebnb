import { NextResponse } from "next/server";
import { captureFilters } from "@/data/equipment";

/**
 * AI-suggested capture plan for a managed session. Given the target and the
 * night's conditions, Gemini proposes how to split the imageable window between
 * the rig's two filter states (clear / L-Extreme). Sub lengths are snapped to
 * the rig's allowed options and the total is clamped to the window server-side,
 * so the model can only ever return a physically sane plan. The user can still
 * edit everything afterwards.
 *
 * Runs server-side so the Gemini key never reaches the browser. Cached in
 * memory per (target + moon + window) for the server's lifetime.
 */
export const runtime = "nodejs";

type FilterSuggestion = { enabled: boolean; subSeconds: number; subs: number };
type PlanSuggestion = {
  rationale: string;
  filters: { key: "clear" | "lextreme"; enabled: boolean; subSeconds: number; subs: number }[];
};

const cache = new Map<string, PlanSuggestion>();

/** Snap an arbitrary sub length to the nearest allowed option for a filter. */
function snapSub(seconds: number, options: number[], fallback: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return fallback;
  return options.reduce((best, o) => (Math.abs(o - seconds) < Math.abs(best - seconds) ? o : best), options[0]);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });

  const objectType = url.searchParams.get("type")?.trim() || null;
  const magnitude = url.searchParams.get("mag");
  const moonPct = Math.round(Number(url.searchParams.get("moon") ?? "0")) || 0;
  const windowHours = Math.max(0, Number(url.searchParams.get("window") ?? "0")) || 0;

  const cacheKey = `${name}|${objectType ?? ""}|${moonPct}|${windowHours.toFixed(1)}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  const clear = captureFilters.find((f) => f.key === "clear")!;
  const lext = captureFilters.find((f) => f.key === "lextreme")!;

  const prompt =
    `You are planning a deep-sky imaging session for a remote rig: William Optics RedCat 91 at f/4.9 with a ` +
    `ZWO ASI2600MC-P25 one-shot colour camera under Bortle 1 skies. The rig has exactly two filter states:\n` +
    `- "clear": no filter, broadband true colour. Sub-length options (seconds): ${clear.subOptions.join(", ")}.\n` +
    `- "lextreme": Optolong L-Extreme dual narrowband (Hα + OIII 7nm). Sub-length options (seconds): ${lext.subOptions.join(", ")}.\n\n` +
    `Target: "${name}"${objectType ? ` (${objectType})` : ""}${magnitude ? `, apparent magnitude ${magnitude}` : ""}.\n` +
    `This night: moon is ${moonPct}% illuminated, and the target is imageable for about ${windowHours.toFixed(1)} hours.\n\n` +
    `Recommend how to split the night. Guidance: broadband objects (galaxies, star clusters, reflection/dust ` +
    `nebulae) want the clear filter and dark skies; emission objects (HII regions, planetary nebulae, supernova ` +
    `remnants) want L-Extreme, which also rescues a bright-moon night. Under a bright moon, lean narrowband. ` +
    `Fainter targets want longer subs. Enable one or both filters. Aim to FILL the night: total integration ` +
    `(sum of subSeconds × subs across enabled filters) should be close to the full ${windowHours.toFixed(1)}-hour ` +
    `window and must not exceed it — choose enough subs that little time is left idle. Pick subSeconds only ` +
    `from each filter's allowed options. Return rationale as one short sentence for a curious beginner.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                rationale: { type: "string" },
                clear: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    subSeconds: { type: "number" },
                    subs: { type: "number" },
                  },
                  required: ["enabled", "subSeconds", "subs"],
                },
                lextreme: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    subSeconds: { type: "number" },
                    subs: { type: "number" },
                  },
                  required: ["enabled", "subSeconds", "subs"],
                },
              },
              required: ["rationale", "clear", "lextreme"],
            },
          },
        }),
      },
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "no content", detail: data?.error?.message ?? null }, { status: 502 });
    }

    const raw = JSON.parse(text) as {
      rationale?: string;
      clear?: FilterSuggestion;
      lextreme?: FilterSuggestion;
    };

    // Snap + clamp each filter to physically valid values the rig can actually shoot.
    const norm = (s: FilterSuggestion | undefined, def: typeof clear) => {
      const enabled = !!s?.enabled;
      const subSeconds = snapSub(Number(s?.subSeconds), def.subOptions, def.defaultSub);
      const subs = Math.max(0, Math.min(999, Math.round(Number(s?.subs) || 0)));
      return { key: def.key, enabled, subSeconds, subs: enabled ? Math.max(1, subs) : subs };
    };

    const filters = [norm(raw.clear, clear), norm(raw.lextreme, lext)];

    // The premise is that we image the whole window, so scale the model's chosen
    // split (its filter choice + ratio + sub lengths) to fill the window — both up
    // if it under-budgeted and down if it overshot. The user can dial it back after.
    if (windowHours > 0) {
      const totalH = filters.reduce((sum, f) => sum + (f.enabled ? (f.subSeconds * f.subs) / 3600 : 0), 0);
      if (totalH > 0) {
        const k = windowHours / totalH;
        for (const f of filters) if (f.enabled) f.subs = Math.max(1, Math.floor(f.subs * k));
      }
    }

    const rationale = (raw.rationale ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
    const suggestion: PlanSuggestion = { rationale, filters };
    cache.set(cacheKey, suggestion);
    return NextResponse.json(suggestion);
  } catch (e) {
    return NextResponse.json(
      { error: "gemini request failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
