"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Section, Card, Eyebrow } from "@/components/ui";
import { ProfileFields, type ProfileFieldValues } from "@/components/ProfileFields";
import { GoogleButton } from "@/components/GoogleButton";
import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { saveUserProfile, isProfileComplete, getUserProfile } from "@/lib/firebase/users";
import { toE164 } from "@/data/countries";
import { site } from "@/config/site";

const emptyProfile: ProfileFieldValues = {
  firstName: "",
  lastName: "",
  country: "",
  phone: "",
  alertsOptIn: true,
  channel: "whatsapp",
};

const stats = [
  { value: `Bortle ${site.location.bortle}`, label: "Truly dark skies" },
  { value: `${site.location.clearNightsPerYear}+`, label: "Clear nights / year" },
  { value: "26 MP", label: "Cooled APS-C color" },
  { value: "3°×2°", label: "Wide field of view" },
];

export default function Signup() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileFieldValues>(emptyProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(p: Partial<ProfileFieldValues>) {
    setProfile((prev) => ({ ...prev, ...p }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!auth) {
      setError("Firebase is not configured yet.");
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      if (fullName) await updateProfile(cred.user, { displayName: fullName });
      await saveUserProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        country: profile.country,
        email: email.trim(),
        phone: toE164(profile.country, profile.phone),
        alertsOptIn: profile.alertsOptIn,
        channel: profile.channel,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/, "") : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  // Google users land here too; route on whether we already have their phone/country.
  async function onGoogle(user: { uid: string }) {
    const p = await getUserProfile(user.uid);
    router.push(isProfileComplete(p) ? "/dashboard" : "/complete-profile");
  }

  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Left: the form */}
        <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Free in under two minutes.</p>
        <Card className="mt-6">
          <GoogleButton label="Continue with Google" onSuccess={onGoogle} />

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-hairline" />
            or
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <ProfileFields values={profile} onChange={patch} />

            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent"
                placeholder="At least 6 characters"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {!firebaseEnabled && (
              <p className="text-xs text-amber-300">Firebase not configured. Add credentials to .env.local.</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Sign up"}
            </button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
        </div>

        {/* Right: brand panel — fills the space and explains why we ask for a phone */}
        <aside className="hidden lg:block lg:pt-10">
          <Eyebrow>{site.name}</Eyebrow>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            The finest optics under the darkest skies.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Book remote imaging time on a world-class rig in {site.location.address[2]},
            under Bortle 1 skies — no gear, no setup, no light pollution.
          </p>

          <dl className="mt-8 grid max-w-md grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-surface p-4 ring-1 ring-hairline">
                <dt className="text-2xl font-semibold tracking-tight">{s.value}</dt>
                <dd className="mt-1 text-xs text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 max-w-md rounded-xl bg-surface p-5 ring-1 ring-hairline">
            <p className="text-sm font-semibold">📡 Never lose a clear night</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Weather can force the observatory roof to close mid-session. We&apos;ll
              alert you by WhatsApp or SMS the moment it happens — so a sudden
              cloud-out never costs you a booking without warning.
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}
