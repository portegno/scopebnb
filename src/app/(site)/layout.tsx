import { SiteHeader } from "@/components/SiteHeader";
import { WarpTransition } from "@/components/WarpTransition";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Public-site shell: the dark, space-themed chrome (header, footer, animated
 * background). The /admin dashboard lives outside this group and has its own
 * light shell, so it doesn't inherit any of this.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="aurora" aria-hidden />
      <div className="starfield" aria-hidden />
      <WarpTransition />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
