import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui";
import { SessionReport } from "@/components/session/SessionReport";
import { loadReport } from "@/lib/sessions/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const report = await loadReport((await params).id);
  if (!report) return { title: "Session report" };
  return {
    title: `${report.target.name} — session report`,
    description: `${report.capture.integration} on ${report.target.name} under Bortle 1 skies.`,
  };
}

export default async function SessionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const report = await loadReport((await params).id);
  if (!report) notFound();

  return (
    <Section>
      <SessionReport report={report} />
    </Section>
  );
}
