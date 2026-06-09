"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { PERMISSION_GROUPS, PERMISSION_LABEL, type Permission } from "@/lib/admin/permissions";

type AdminUser = { email: string; permissions: Permission[]; displayName?: string };

const btnPrimary =
  "rounded-[4px] bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
const input =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500";

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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team</h1>
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
        <span className="text-sm font-semibold text-slate-800">{user.email}</span>
        <span className="text-xs text-slate-400">{perms.length} permissions</span>
      </div>
      <PermPicker selected={perms} onChange={setPerms} />
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={busy || !dirty} className={btnPrimary}>
          Save
        </button>
        <button onClick={remove} disabled={busy} className="rounded-[4px] px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
          Remove
        </button>
      </div>
    </Card>
  );
}

function AddUser({ reload }: { reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<Permission[]>([]);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!email.includes("@")) return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/team/users", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), permissions: perms }),
      });
      setEmail("");
      setPerms([]);
      setOpen(false);
      reload();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not add user");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        + Add user
      </button>
    );
  }

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-slate-400">Add a user</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        className={`${input} mt-3 w-72`}
      />
      <PermPicker selected={perms} onChange={setPerms} />
      <div className="mt-4 flex gap-2">
        <button onClick={add} disabled={busy || !email.includes("@")} className={btnPrimary}>
          Add user
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </Card>
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
                <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} className="accent-slate-900" />
                {PERMISSION_LABEL[p]}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
