"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { PERMISSION_GROUPS, PERMISSION_LABEL, type Permission } from "@/lib/admin/permissions";

type AdminUser = { email: string; permissions: Permission[]; firstName?: string; lastName?: string };

const fullName = (u: AdminUser) => [u.firstName, u.lastName].filter(Boolean).join(" ");

const btnPrimary =
  "rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50";
const btnGhost =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const input =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500";

const MIN_PASSWORD = 8;

export default function TeamPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const u = await adminFetch<{ users: AdminUser[] }>("/api/admin/team/users");
      setUsers(u.users);
    } catch (e) {
      setError(
        e instanceof AdminFetchError && e.status === 403
          ? "Only super admins can manage the team."
          : "Could not load the team.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-background">Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add people by email and grant them permissions directly. Super admins always have full access.
        </p>
      </div>

      {users.length === 0 && <p className="text-sm text-slate-500">No team members yet.</p>}
      {users.map((u) => (
        <UserCard key={u.email} user={u} reload={load} />
      ))}

      <AddUser reload={load} />
    </div>
  );
}

function UserCard({ user, reload }: { user: AdminUser; reload: () => void }) {
  const [perms, setPerms] = useState<Permission[]>(user.permissions);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify([...perms].sort()) !== JSON.stringify([...user.permissions].sort());

  // Set / reset this member's login password (email + password credential).
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  async function savePassword() {
    if (pw.length < MIN_PASSWORD) return;
    setPwBusy(true);
    try {
      await adminFetch(`/api/admin/team/users/${encodeURIComponent(user.email)}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: pw }),
      });
      setPw("");
      setPwOpen(false);
      setPwDone(true);
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not set password");
    } finally {
      setPwBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/team/users/${encodeURIComponent(user.email)}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: perms }),
      });
      reload();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm(`Remove ${user.email} from the team?`)) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/team/users/${encodeURIComponent(user.email)}`, { method: "DELETE" });
      reload();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          {fullName(user) && <span className="block text-sm font-semibold text-slate-800">{fullName(user)}</span>}
          <span className="block truncate text-xs text-slate-500">{user.email}</span>
        </span>
        <span className="shrink-0 text-xs text-slate-400">{perms.length} permissions</span>
      </div>
      <PermPicker selected={perms} onChange={setPerms} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy || !dirty} className={btnPrimary}>
          Save
        </button>
        {!pwOpen && (
          <button onClick={() => { setPwOpen(true); setPwDone(false); }} className={btnGhost}>
            {pwDone ? "Password updated ✓" : "Set password"}
          </button>
        )}
        <button onClick={remove} disabled={busy} className="rounded-[4px] px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
          Remove
        </button>
      </div>

      {pwOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PasswordInput
            value={pw}
            onChange={setPw}
            placeholder={`New password (min ${MIN_PASSWORD} characters)`}
            autoComplete="new-password"
          />
          <button onClick={savePassword} disabled={pwBusy || pw.length < MIN_PASSWORD} className={btnPrimary}>
            {pwBusy ? "Saving…" : "Save password"}
          </button>
          <button onClick={() => { setPwOpen(false); setPw(""); }} className={btnGhost}>
            Cancel
          </button>
        </div>
      )}
    </Card>
  );
}

function AddUser({ reload }: { reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Permission[]>([]);
  const [busy, setBusy] = useState(false);

  const emailOk = email.includes("@");
  const passwordOk = password.length >= MIN_PASSWORD;
  const canSubmit = emailOk && passwordOk && !busy;

  function reset() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setPerms([]);
    setOpen(false);
  }

  async function add() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/team/users", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          permissions: perms,
        }),
      });
      reset();
      reload();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not add user");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnGhost}>
        + Add user
      </button>
    );
  }

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-slate-400">Add a user</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={`${input} w-44`} />
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={`${input} w-44`} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={`${input} w-72`} />
      </div>
      <div className="mt-3">
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder={`Password (min ${MIN_PASSWORD} characters)`}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-slate-400">
          The user signs in at the login page with their email and this password. They can change it later.
        </p>
      </div>
      <PermPicker selected={perms} onChange={setPerms} />
      <div className="mt-4 flex gap-2">
        <button onClick={add} disabled={!canSubmit} className={btnPrimary}>
          Add user
        </button>
        <button onClick={reset} className={btnGhost}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

/** Password field with a show/hide toggle. Pure presentation. */
function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-72 max-w-full">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${input} w-full pr-16`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function PermPicker({ selected, onChange }: { selected: Permission[]; onChange: (v: Permission[]) => void }) {
  const toggle = (p: Permission) => onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PERMISSION_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{g.label}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {g.permissions.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} className="accent-surface-2" />
                {PERMISSION_LABEL[p]}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
