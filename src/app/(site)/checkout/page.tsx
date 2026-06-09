import type { Metadata } from "next";
import { Section, Eyebrow, ComingSoon } from "@/components/ui";

export const metadata: Metadata = { title: "Checkout" };

export default function Checkout() {
  return (
    <Section className="max-w-2xl">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Checkout</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Payment</h1>
        <div className="mt-8">
          <ComingSoon note="Stripe payment integration comes next." />
        </div>
      </div>
    </Section>
  );
}
