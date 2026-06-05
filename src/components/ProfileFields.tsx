"use client";

import { countries, dialFor } from "@/data/countries";
import type { AlertChannel } from "@/lib/firebase/users";

/** The contact fields shared by signup and the complete-profile step. */
export type ProfileFieldValues = {
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  alertsOptIn: boolean;
  channel: AlertChannel;
};

const channelOptions: { value: AlertChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "both", label: "Both" },
];

const inputClass =
  "mt-1 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent";

/**
 * Pure, controlled form fields for the user's contact profile. Holds no state
 * itself — the parent owns `values` and applies each `onChange` patch.
 */
export function ProfileFields({
  values,
  onChange,
}: {
  values: ProfileFieldValues;
  onChange: (patch: Partial<ProfileFieldValues>) => void;
}) {
  const dial = dialFor(values.country);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted">First name</label>
          <input
            required
            value={values.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            className={inputClass}
            placeholder="Jane"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted">Last name</label>
          <input
            required
            value={values.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            className={inputClass}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-muted">Country</label>
        <select
          required
          value={values.country}
          onChange={(e) => onChange({ country: e.target.value })}
          className={inputClass}
        >
          <option value="" disabled>
            Select your country
          </option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.dial})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-muted">
          Phone (WhatsApp / SMS)
        </label>
        <div className="mt-1 flex items-stretch gap-2">
          <span className="inline-flex h-11 min-w-14 items-center justify-center rounded-lg bg-surface-2 px-3 text-sm text-muted ring-1 ring-hairline">
            {dial || "+"}
          </span>
          <input
            type="tel"
            required
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent"
            placeholder="512 555 0123"
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Used only for urgent alerts — like a roof closure due to weather.
        </p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-muted">
          Preferred alert channel
        </label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {channelOptions.map((o) => {
            const selected = values.channel === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ channel: o.value })}
                aria-pressed={selected}
                className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-accent text-background"
                    : "bg-surface-2 text-foreground ring-1 ring-hairline hover:bg-surface-2/70"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={values.alertsOptIn}
          onChange={(e) => onChange({ alertsOptIn: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded accent-accent"
        />
        <span>
          Send me WhatsApp / SMS alerts about my sessions (weather closures,
          rescheduling). You can opt out anytime.
        </span>
      </label>
    </>
  );
}
