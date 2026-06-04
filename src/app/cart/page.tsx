import type { Metadata } from "next";
import { Section, Eyebrow, ComingSoon } from "@/components/ui";

export const metadata: Metadata = { title: "Cart" };

export default function Cart() {
  return (
    <Section className="max-w-2xl">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Checkout</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your cart</h1>
        <div className="mt-8">
          <ComingSoon note="Cart & Stripe checkout are scaffolded. Wiring comes next." />
        </div>
      </div>
    </Section>
  );
}
