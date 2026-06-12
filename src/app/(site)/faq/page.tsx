import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui";
import { faqs } from "@/data/faq";
import { FaqAccordion } from "@/components/FaqAccordion";

export const metadata: Metadata = { title: "FAQ" };

export default function FAQ() {
  return (
    <Section>
      <Eyebrow>Support</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
      <FaqAccordion items={faqs} />
    </Section>
  );
}
