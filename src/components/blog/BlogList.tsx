"use client";

import Link from "next/link";
import { useState } from "react";
import { LevelMeter } from "@/components/blog/LevelMeter";
import { POST_LEVELS, POST_LEVEL_META, type BlogPost, type PostLevel } from "@/lib/blog/types";

type Filter = PostLevel | "all";

/**
 * Public blog grid with a difficulty filter. Filtering is client-side (the list
 * is small and already loaded), so switching levels is instant. Filter chips
 * only appear for levels that actually exist among the posts.
 */
export function BlogList({ posts }: { posts: BlogPost[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const levelsPresent = POST_LEVELS.filter((l) => posts.some((p) => p.level === l));
  const shown = filter === "all" ? posts : posts.filter((p) => p.level === filter);

  return (
    <>
      {levelsPresent.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All levels
          </Chip>
          {levelsPresent.map((l) => (
            <Chip key={l} active={filter === l} onClick={() => setFilter(l)}>
              <LevelMeter level={l} showLabel={false} />
              {POST_LEVEL_META[l].short}
            </Chip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-10 text-muted">No posts at this level yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group overflow-hidden rounded-[4px] bg-surface ring-1 ring-hairline transition-colors hover:ring-accent/50"
            >
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full bg-surface-2" />
              )}
              <div className="p-5">
                {p.level && <LevelMeter level={p.level} className="mb-2 text-muted" />}
                <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-accent">
                  {p.title || "Untitled"}
                </h2>
                {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
        active
          ? "bg-surface-2 text-foreground ring-accent/50"
          : "bg-surface text-muted ring-hairline hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
