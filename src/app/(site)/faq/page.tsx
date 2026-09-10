import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui";
import { faqs } from "@/data/faq";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqLd } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about managed imaging, remote control, weather guarantee, what you receive, and pricing at ScopeBnB.",
  alternates: { canonical: "/faq" },
};

export default function FAQ() {
  return (
    <Section>
      <JsonLd data={faqLd(faqs)} />
      <Eyebrow>Support</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
      <FaqAccordion items={faqs} />
    </Section>
  );
}
