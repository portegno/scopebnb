import { POST_LEVEL_META, type PostLevel } from "@/lib/blog/types";

const BAR_COLOR: Record<PostLevel, string> = {
  beginner: "bg-emerald-500",
  intermediate: "bg-amber-500",
  advanced: "bg-violet-500",
};

/**
 * "Expertometer": a small three-bar signal meter showing a post's topic
 * difficulty. Filled bars = the level's steps, in the level color; the rest are
 * dimmed. Theme-agnostic colors so it reads on both the dark public site and the
 * light admin. Renders nothing when no level is set.
 */
export function LevelMeter({
  level,
  showLabel = true,
  className = "",
}: {
  level: PostLevel | null;
  showLabel?: boolean;
  className?: string;
}) {
  if (!level) return null;
  const meta = POST_LEVEL_META[level];
  const heights = [7, 10, 13]; // ascending, like a signal-strength meter

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title="Topic complexity, not a barrier — all levels welcome"
      aria-label={`Difficulty: ${meta.short}`}
    >
      <span className="flex items-end gap-[2px]" aria-hidden>
        {heights.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-[1px] ${i < meta.steps ? BAR_COLOR[level] : "bg-current opacity-25"}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </span>
      {showLabel && <span className="text-xs font-medium">{meta.label}</span>}
    </span>
  );
}
