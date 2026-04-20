"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HiPlus, HiUsers, HiUpload, HiDownload } from "react-icons/hi";
import Papa from "papaparse";

export default function AudiencePage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedGroup, setSelectedGroup] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    const res = await fetch("/api/audience");
    const data = await res.json();
    setGroups(data);
    setLoading(false);
  }

  async function create() {
    const res = await fetch("/api/audience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setGroups((g) => [{ ...data, _count: { contacts: 0 } }, ...g]);
    setOpen(false);
    setForm({ name: "", description: "" });
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const contacts = results.data.map((row: any) => ({
          email: row.email || row.Email,
          firstName: row.firstName || row["First Name"] || row.first_name,
          lastName: row.lastName || row["Last Name"] || row.last_name,
          company: row.company || row.Company,
        })).filter((c: any) => c.email);

        const res = await fetch("/api/contacts/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts, groupId: selectedGroup || undefined }),
        });
        const data = await res.json();
        setImportResult(`Successfully imported ${data.imported} contacts!`);
        setImporting(false);
        await fetchGroups();
      },
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3 justify-end">
        <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); setImportResult(null); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-xl border-gray-200 text-sm font-medium flex items-center gap-2">
              <HiUpload /> Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Import Contacts from CSV</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-500">CSV must have columns: email, firstName, lastName, company</p>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Add to Group (optional)</Label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400"
                >
                  <option value="">No group</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-violet-300 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <HiUpload className="text-4xl text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to upload CSV file</p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
              </div>
              {importing && <p className="text-sm text-violet-600 text-center animate-pulse">Importing...</p>}
              {importResult && <p className="text-sm text-emerald-600 text-center font-medium">✓ {importResult}</p>}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Sample CSV format:</p>
                <code className="text-xs text-gray-600 block">email,firstName,lastName,company</code>
                <code className="text-xs text-gray-600 block">john@example.com,John,Doe,Acme Inc</code>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl font-semibold text-sm flex items-center gap-2">
              <HiPlus /> New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>Create Audience Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Group Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" placeholder="Newsletter Subscribers" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl h-11" placeholder="Group description..." />
              </div>
              <Button onClick={create} disabled={!form.name} className="w-full brand-gradient-bg text-white border-0 hover:opacity-90 rounded-xl h-11 font-semibold">
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-gray-100" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <HiUsers className="text-5xl mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-600">No audience groups yet</p>
          <p className="text-sm mt-1">Create groups and import contacts to segment your audience</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <HiUsers className="text-blue-500 text-lg" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{g.name}</h3>
              {g.description && <p className="text-sm text-gray-500 mb-3">{g.description}</p>}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {g._count?.contacts || 0}
                </span>
                <span className="text-sm text-gray-400">contacts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
