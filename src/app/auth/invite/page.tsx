"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HiUserGroup, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import Link from "next/link";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invite token provided.");
      setLoading(false);
      return;
    }

    fetch(`/api/team/invite?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInvite(data);
      })
      .catch(() => setError("Failed to verify invitation."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleJoin() {
    if (status === "unauthenticated") {
      router.push(`/auth/register?email=${encodeURIComponent(invite.email)}&token=${token}`);
      return;
    }

    setJoining(true);
    setError("");

    try {
      const res = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) setError(data.error || "Failed to join team");
      else setSuccess(true);
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <p className="relative z-10 text-sm font-medium text-[#7331FF]">
        Verifying invitation…
      </p>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-md">
      <Card className="w-full overflow-hidden rounded-2xl border border-[#7331FF]/12 bg-white/95 shadow-2xl shadow-[#7331FF]/10 backdrop-blur-xl">
        <div className="h-2 brand-gradient-bg" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7331FF]/10">
            <HiUserGroup className="text-3xl text-[#7331FF]" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Team Invitation</CardTitle>
          <CardDescription>
            {invite ? `Join ${invite.teamName} on AmplifyHub AI` : "Invitation error"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-8">
          {error ? (
            <div className="flex flex-col items-center gap-2 text-red-600">
              <HiExclamationCircle className="text-4xl" />
              <p className="font-medium">{error}</p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-4 text-green-600">
              <HiCheckCircle className="text-5xl" />
              <p className="font-bold text-xl text-gray-900">Welcome to the team!</p>
              <p className="text-gray-600">You have successfully joined <strong>{invite.teamName}</strong>.</p>
              <Button asChild className="mt-4 brand-gradient-bg text-white w-full">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed">
                <strong>{invite.inviterName}</strong> has invited you to join their team 
                <span className="font-semibold text-[#7331FF]"> {invite.teamName}</span> as an 
                <span className="ml-1 rounded bg-[#7331FF]/10 px-2 py-0.5 text-xs font-semibold uppercase text-[#7331FF]"> {invite.role}</span>.
              </p>
              {status === "authenticated" && session.user?.email?.toLowerCase() !== invite.email.toLowerCase() && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  You are logged in as <strong>{session.user?.email}</strong>, but this invite was sent to <strong>{invite.email}</strong>.
                </p>
              )}
            </div>
          )}
        </CardContent>
        {!success && !error && (
          <CardFooter className="flex flex-col gap-3 pb-8">
            <Button 
              onClick={handleJoin} 
              disabled={joining}
              className="brand-gradient-bg h-12 w-full border-0 text-lg font-bold text-white shadow-lg shadow-[#7331FF]/20 hover:opacity-90"
            >
              {joining ? "Joining..." : status === "authenticated" ? "Accept Invitation" : "Sign Up to Join Team"}
            </Button>
            {status === "authenticated" ? (
              <p className="text-xs text-gray-500 text-center">
                Accepting will give you access to the team's dashboard.
              </p>
            ) : (
              <p className="text-xs text-gray-500 text-center">
                Already have an account? <Link href="/auth/login" className="font-bold text-[#7331FF] hover:underline">Log in</Link>
              </p>
            )}
          </CardFooter>
        )}
        {error && (
          <CardFooter className="pb-8">
            <Button asChild variant="outline" className="w-full border-gray-200 text-gray-600 font-bold h-12">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<p className="relative z-10 text-sm text-[#7331FF]">Loading…</p>}>
      <InviteContent />
    </Suspense>
  );
}
