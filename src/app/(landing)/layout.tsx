import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SkyPole } from "@/components/SkyPole";
import { site } from "@/config/site";

/**
 * Landing shell — the site's sky, without the site's navigation.
 *
 * A landing arrives from one cold email and has one job. The public header
 * carries links to /pricing, /blog, /faq and a login: on a normal page that's
 * service, here every one of them is an exit from the only action we asked for.
 * So the chrome goes and the world stays — the aurora, the starfield and the
 * pole that pins the sky's rotation to the mark. The brand is the sky, not the
 * navbar.
 *
 * The mark still links home, because a page that traps you reads worse than a
 * page that lets you leave.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="aurora" aria-hidden />
      <div className="starfield" aria-hidden />
      <SkyPole />

      <header className="absolute inset-x-0 top-0 z-20 flex justify-center px-6 py-6">
        <Link href="/" aria-label={site.name}>
          <Wordmark gradientId="sbGradLanding" className="logo-glow-soft h-7 w-auto" />
        </Link>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hairline px-6 py-8 text-center text-xs text-muted">
        {site.name} · {site.location.observatory} · Bortle {site.location.bortle}, Texas
      </footer>
    </div>
  );
}
