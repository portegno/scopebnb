import type { Metadata } from "next";
import { Section, Eyebrow, Card } from "@/components/ui";
import { faqs } from "@/data/faq";

export const metadata: Metadata = { title: "FAQ" };

export default function FAQ() {
  return (
    <Section>
      <Eyebrow>Support</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
      <div className="mt-10 space-y-4">
        {faqs.map((f) => (
          <Card key={f.q} className="p-0">
            <details className="group p-6">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-accent transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          </Card>
        ))}
      </div>
    </Section>
  );
}
