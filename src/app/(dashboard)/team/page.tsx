"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HiUserAdd } from "react-icons/hi";
import { formatRelative } from "@/lib/utils";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  organization?: string;
  status: "INVITED" | "ACTIVE";
  invitedAt: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "EDITOR", organization: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchMembers();
  }, []);

  async function fetchMembers() {
    const res = await fetch("/api/team-members");
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function addMember() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed to add member");
    else {
      setMembers((prev) => [data, ...prev]);
      setForm({ name: "", email: "", role: "EDITOR", organization: "" });
    }
    setSaving(false);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Add Team Member</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="mb-2 block">Name</Label>
             <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="text-black" />
          </div>
          <div>
            <Label className="mb-2 block">Email</Label>
             <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="text-black" />
          </div>
          <div>
            <Label className="mb-2 block">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
               <SelectTrigger className="text-black"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Organization</Label>
             <Input value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} className="text-black" />
          </div>
        </div>
        <Button onClick={addMember} disabled={saving || !form.name || !form.email} className="brand-gradient-bg text-white">
          <HiUserAdd className="mr-2" />
          {saving ? "Adding..." : "Invite Team Member"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">{members.length} team members</p>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No team members added yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                  <p className="text-xs text-gray-400">Invited {formatRelative(m.invitedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-violet-700">{m.role}</p>
                  <p className="text-xs text-gray-500">{m.organization || "No organization"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
