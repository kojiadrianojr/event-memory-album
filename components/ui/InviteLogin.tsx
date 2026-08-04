"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredGuestName, notifyGuestNameSet } from "@/lib/guest-storage";
import { safeFormatDate } from "@/lib/safe-date";

type Member = { name: string };

type InvitationOption = {
  invitationId: string;
  groupName: string | null;
  members: Member[];
  event: { name: string; eventDate: string | null };
};

type LookupResult = {
  invitations: InvitationOption[];
};

function formatEventLabel(event: InvitationOption["event"]): string {
  const dateLabel = event.eventDate
    ? safeFormatDate(event.eventDate, "MMM d, yyyy")
    : "";
  return dateLabel ? `${event.name} · ${dateLabel}` : event.name;
}

export function InviteLogin() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null);
  const [pendingInvitationId, setPendingInvitationId] = useState<
    string | null
  >(null);
  const [selectedName, setSelectedName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedInvitation =
    lookup?.invitations.find((i) => i.invitationId === selectedInvitationId) ??
    null;
  const needsEventPicker =
    lookup !== null && lookup.invitations.length > 1 && !selectedInvitation;

  useEffect(() => {
    if (!lookup || lookup.invitations.length !== 1) return;
    const invitation = lookup.invitations[0];
    setSelectedInvitationId(invitation.invitationId);
    if (invitation.members.length === 1) {
      setSelectedName(invitation.members[0].name);
    }
  }, [lookup]);

  useEffect(() => {
    if (!selectedInvitation) return;
    if (selectedInvitation.members.length === 1) {
      setSelectedName(selectedInvitation.members[0].name);
    } else {
      setSelectedName("");
    }
  }, [selectedInvitation]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;

    setLoading(true);
    setError("");
    setSelectedInvitationId(null);
    setPendingInvitationId(null);
    setSelectedName("");
    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      if (!res.ok) {
        setError("That invite code wasn't found. Please check and try again.");
        return;
      }
      const data = (await res.json()) as LookupResult;
      setLookup(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvitationId || !selectedName) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: selectedInvitationId,
          guestName: selectedName,
        }),
      });
      if (!res.ok) {
        setError("We couldn't sign you in. Please try again.");
        return;
      }
      const data = (await res.json()) as {
        redirect: string;
        guestName: string;
        eventId: string;
      };
      // Pre-fill the stored guest name so GuestNamePrompt is skipped.
      setStoredGuestName(data.eventId, data.guestName);
      notifyGuestNameSet(data.eventId, data.guestName);
      router.push(data.redirect);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setLookup(null);
    setSelectedInvitationId(null);
    setPendingInvitationId(null);
    setSelectedName("");
    setError("");
  }

  function backFromMemberPicker() {
    if (lookup && lookup.invitations.length > 1) {
      setSelectedInvitationId(null);
      setPendingInvitationId(null);
      setSelectedName("");
      setError("");
      return;
    }
    reset();
  }

  if (needsEventPicker) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <p className="text-xs text-zinc-500 text-center">
          This invite code is used for more than one event. Which event are you
          joining?
        </p>

        <div className="flex flex-col gap-2">
          {lookup.invitations.map((invitation) => (
            <label
              key={invitation.invitationId}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                pendingInvitationId === invitation.invitationId
                  ? "border-zinc-800 bg-zinc-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                name="event"
                value={invitation.invitationId}
                checked={pendingInvitationId === invitation.invitationId}
                onChange={() =>
                  setPendingInvitationId(invitation.invitationId)
                }
                className="accent-zinc-800"
              />
              <span className="text-sm text-zinc-900">
                {formatEventLabel(invitation.event)}
              </span>
            </label>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 border border-red-200 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!pendingInvitationId || loading}
          onClick={() => {
            if (!pendingInvitationId) return;
            setSelectedInvitationId(pendingInvitationId);
          }}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-zinc-400 hover:text-zinc-600 text-center"
        >
          ← Use a different code
        </button>
      </div>
    );
  }

  if (selectedInvitation) {
    return (
      <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full">
        {lookup && lookup.invitations.length > 1 && (
          <p className="text-sm font-medium text-zinc-700 text-center">
            {formatEventLabel(selectedInvitation.event)}
          </p>
        )}
        {selectedInvitation.groupName && (
          <p className="text-sm font-medium text-zinc-700 text-center">
            {selectedInvitation.groupName}
          </p>
        )}
        <p className="text-xs text-zinc-500 text-center">
          Who&apos;s joining? Select your name.
        </p>

        <div className="flex flex-col gap-2">
          {selectedInvitation.members.map((m) => (
            <label
              key={m.name}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                selectedName === m.name
                  ? "border-zinc-800 bg-zinc-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                name="member"
                value={m.name}
                checked={selectedName === m.name}
                onChange={() => setSelectedName(m.name)}
                className="accent-zinc-800"
              />
              <span className="text-sm text-zinc-900">{m.name}</span>
            </label>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 border border-red-200 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!selectedName || loading}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Signing in…" : "Continue →"}
        </button>
        <button
          type="button"
          onClick={backFromMemberPicker}
          className="text-xs text-zinc-400 hover:text-zinc-600 text-center"
        >
          {lookup && lookup.invitations.length > 1
            ? "← Choose a different event"
            : "← Use a different code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLookup} className="flex flex-col gap-3 w-full">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter your invite code"
        maxLength={6}
        className="form-field-lg-mono w-full"
        autoComplete="off"
        spellCheck={false}
      />
      {error && (
        <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 border border-red-200 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={code.trim().length !== 6 || loading}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Looking up…" : "Continue →"}
      </button>
      <p className="text-[11px] text-zinc-400 text-center leading-snug">
        Your invite code is on your invitation.
      </p>
    </form>
  );
}
