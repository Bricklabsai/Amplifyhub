"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setHasPassword(Boolean(data.hasPassword));
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      await update({ name: name.trim() });
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function updatePassword() {
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to update password"
        );
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not update",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)] animate-pulse bg-gray-50/50 md:-m-6">
        <div className="h-28 bg-gray-100" />
        <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
          <div className="h-40 bg-gray-100" />
          <div className="h-56 bg-gray-100" />
        </div>
      </div>
    );
  }

  const initial =
    name?.[0]?.toUpperCase() || session?.user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-gray-50/40 md:-m-6">
      <div className="border-b border-gray-100 bg-white px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl brand-gradient-bg text-3xl font-black text-white shadow-md">
            {initial}
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 md:text-3xl"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500">{email}</p>
            <p className="mt-2 text-sm text-gray-600">
              Manage how you appear in AmplifyHub and keep your login secure.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
        <section className="border-b border-gray-200 pb-10">
          <h2
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Personal information
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your name is shown across campaigns and team views.
          </p>
          <div className="mt-6 grid max-w-xl gap-5">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">
                Display name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-gray-200 bg-white text-black"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">
                Email address
              </Label>
              <Input
                value={email}
                disabled
                className="h-11 rounded-xl border-gray-200 bg-white text-black opacity-70"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Login email cannot be changed here.
              </p>
            </div>
            <Button
              onClick={saveProfile}
              disabled={savingProfile}
              className="h-11 w-fit brand-gradient-bg rounded-xl border-0 px-8 text-sm font-semibold text-white hover:opacity-90"
            >
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>

        <section className="pt-10">
          <h2
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Password
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {hasPassword
              ? "Update the password you use to sign in with email."
              : "You signed in with Google or another provider — password change is not available."}
          </p>
          <div className="mt-6 grid max-w-xl gap-5">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">
                Current password
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={!hasPassword}
                className="h-11 rounded-xl border-gray-200 bg-white"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">
                  New password
                </Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!hasPassword}
                  className="h-11 rounded-xl border-gray-200 bg-white"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm password
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!hasPassword}
                  className="h-11 rounded-xl border-gray-200 bg-white"
                />
              </div>
            </div>
            <Button
              onClick={updatePassword}
              disabled={savingPassword || !hasPassword}
              variant="outline"
              className="h-11 w-fit rounded-xl border-gray-300 bg-white px-8 text-sm font-semibold"
            >
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
