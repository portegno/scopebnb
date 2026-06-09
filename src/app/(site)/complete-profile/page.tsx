"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { Section, Card } from "@/components/ui";
import { ProfileFields, type ProfileFieldValues } from "@/components/ProfileFields";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { getUserProfile, saveUserProfile } from "@/lib/firebase/users";
import { toE164 } from "@/data/countries";

export default function CompleteProfile() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileFieldValues>({
    firstName: "",
    lastName: "",
    country: "",
    phone: "",
    alertsOptIn: true,
    channel: "whatsapp",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Must be signed in; prefill whatever the Google sign-in already seeded.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    getUserProfile(user.uid).then((p) => {
      if (p) {
        setProfile((prev) => ({
          ...prev,
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          country: p.country ?? "",
          phone: p.phone ?? "",
          alertsOptIn: p.alertsOptIn ?? true,
          channel: p.channel ?? "whatsapp",
        }));
      }
    });
  }, [user, loading, router]);

  function patch(p: Partial<ProfileFieldValues>) {
    setProfile((prev) => ({ ...prev, ...p }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      if (auth?.currentUser && fullName) {
        await updateProfile(auth.currentUser, { displayName: fullName });
      }
      await saveUserProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        country: profile.country,
        email: user?.email ?? "",
        phone: toE164(profile.country, profile.phone),
        alertsOptIn: profile.alertsOptIn,
        channel: profile.channel,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/, "") : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="mt-2 text-sm text-muted">
          We just need a phone number so we can reach you about your sessions.
        </p>
        <Card className="mt-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <ProfileFields values={profile} onChange={patch} />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save and continue"}
            </button>
          </form>
        </Card>
      </div>
    </Section>
  );
}
