import Link from "next/link";
import { footerSections, site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface/70 ring-1 ring-hairline backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt={site.name} className="h-5 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-muted">{site.tagline}</p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {section.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {section.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-foreground/80 hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-hairline px-6 py-5 text-center text-xs text-muted">
        © {site.name} 2026 · Bortle 1 · Texas
      </div>
    </footer>
  );
}
