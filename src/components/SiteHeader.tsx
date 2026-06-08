"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks, site } from "@/config/site";
import { scrollToHash } from "@/lib/scrollToHash";
import { Wordmark } from "@/components/Wordmark";
import { ForecastNavIcon } from "@/components/ForecastNavIcon";
import { useAuth } from "@/lib/firebase/useAuth";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On the home page the bar floats transparent over the hero image, then
  // turns solid once you scroll. Everywhere else it's always solid.
  const transparent = isHome && !scrolled;

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ease-out ${
        transparent
          ? "bg-transparent"
          : "bg-background/80 backdrop-blur ring-1 ring-hairline"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label={site.name}
          className={`flex items-center transition-opacity duration-300 ${
            transparent ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <Wordmark gradientId="sbGradHeader" followMouse className="logo-glow-soft h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  if (scrollToHash(l.href)) e.preventDefault();
                }}
                aria-current={active ? "page" : undefined}
                className={`text-sm transition-colors ${
                  transparent
                    ? active
                      ? "font-medium text-gold"
                      : "text-white/90 hover:text-gold"
                    : active
                      ? "font-medium text-accent"
                      : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <ForecastNavIcon transparent={transparent} active={isActive("/forecast")} />
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {!loading &&
            (user ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-gold transition-colors hover:text-gold-soft"
              >
                My Sessions
              </Link>
            ) : (
              <Link
                href="/login"
                className={`text-sm transition-colors ${
                  transparent ? "text-white/90 hover:text-gold" : "text-muted hover:text-foreground"
                }`}
              >
                Log in
              </Link>
            ))}
          <Link
            href="/book"
            className="inline-flex h-9 items-center rounded-[4px] bg-gold px-4 text-sm font-semibold text-background hover:bg-gold/90"
          >
            Book a night
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className={`md:hidden ${transparent ? "text-white" : "text-muted"}`}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 px-6 pb-4 md:hidden">
          {navLinks.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  if (scrollToHash(l.href)) e.preventDefault();
                  setOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-2 py-2 text-sm hover:bg-surface ${
                  active ? "font-medium text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <ForecastNavIcon
            onClick={() => setOpen(false)}
            className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface ${
              isActive("/forecast") ? "font-medium text-accent" : "text-muted hover:text-foreground"
            }`}
          />
          {!loading &&
            (user ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-semibold text-gold hover:bg-surface hover:text-gold-soft"
              >
                My Sessions
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
              >
                Log in
              </Link>
            ))}
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-[4px] bg-gold px-4 text-sm font-semibold text-background"
          >
            Book a night
          </Link>
        </nav>
      )}
    </header>
  );
}
