"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type InviteMember = { id: string; name: string };
type Invitation = {
  id: string;
  code: string;
  groupName: string | null;
  members: InviteMember[];
};
type JoinedGuest = {
  id: string;
  name: string;
  joinedAt: string;
  uploadCount: number;
};

type IndividualInviteRow = {
  memberId: string;
  name: string;
  code: string;
};

type AccessMode = "INVITE_ONLY" | "EVENT_CODE" | "BOTH";
type ListFilter = "all" | "grouped" | "individual";
type MainTab = "invites" | "joined";

type DeleteRequest =
  | { kind: "invite-member"; memberId: string; memberName: string }
  | { kind: "invite-group"; invitation: Invitation }
  | { kind: "joined-guest"; guestId: string; guestName: string };

type Props = {
  adminToken: string;
  accessMode: AccessMode;
  initialInvitations: Invitation[];
  initialJoinedGuests: JoinedGuest[];
};

function matchesSearch(
  query: string,
  parts: (string | null | undefined)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => p?.toLowerCase().includes(q));
}

function isGroupedInvitation(inv: Invitation): boolean {
  return Boolean(inv.groupName?.trim());
}

function sortInvitations(list: Invitation[]): Invitation[] {
  return [...list].sort((a, b) => {
    const aLabel = (a.groupName ?? a.members[0]?.name ?? a.code).toLowerCase();
    const bLabel = (b.groupName ?? b.members[0]?.name ?? b.code).toLowerCase();
    return aLabel.localeCompare(bLabel);
  });
}

function sortJoined(list: JoinedGuest[]): JoinedGuest[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export default function AdminGuestsManager({
  adminToken,
  accessMode,
  initialInvitations,
  initialJoinedGuests,
}: Props) {
  const showInvites =
    accessMode === "INVITE_ONLY" || accessMode === "BOTH";

  const [invitations, setInvitations] = useState(initialInvitations);
  const [joinedGuests, setJoinedGuests] = useState(initialJoinedGuests);
  const [search, setSearch] = useState("");
  const [mainTab, setMainTab] = useState<MainTab>(
    showInvites ? "invites" : "joined"
  );
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addMode, setAddMode] = useState<"invite" | "joined">(
    showInvites ? "invite" : "joined"
  );
  const [guestName, setGuestName] = useState("");
  const [inviteGuestNames, setInviteGuestNames] = useState<string[]>([""]);
  const [groupName, setGroupName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const nameToGroupedInvite = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const inv of invitations) {
      const grouped = isGroupedInvitation(inv);
      for (const m of inv.members) {
        map.set(m.name, grouped);
      }
    }
    return map;
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    const searched = invitations.filter((inv) =>
      matchesSearch(search, [
        inv.code,
        inv.groupName,
        ...inv.members.map((m) => m.name),
      ])
    );

    const byFilter =
      listFilter === "grouped"
        ? searched.filter(isGroupedInvitation)
        : listFilter === "individual"
          ? searched.filter((inv) => !isGroupedInvitation(inv))
          : searched;

    return sortInvitations(byFilter);
  }, [invitations, search, listFilter]);

  const groupedInvitations = useMemo(
    () => sortInvitations(filteredInvitations.filter(isGroupedInvitation)),
    [filteredInvitations]
  );

  const individualInvitations = useMemo(
    () =>
      sortInvitations(filteredInvitations.filter((inv) => !isGroupedInvitation(inv))),
    [filteredInvitations]
  );

  const individualInviteRows = useMemo(() => {
    const rows: IndividualInviteRow[] = [];
    for (const inv of individualInvitations) {
      for (const member of inv.members) {
        rows.push({
          memberId: member.id,
          name: member.name,
          code: inv.code,
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [individualInvitations]);

  const filteredJoined = useMemo(() => {
    const searched = joinedGuests.filter((g) => matchesSearch(search, [g.name]));

    const byFilter =
      listFilter === "grouped"
        ? searched.filter((g) => nameToGroupedInvite.get(g.name) === true)
        : listFilter === "individual"
          ? searched.filter((g) => nameToGroupedInvite.get(g.name) !== true)
          : searched;

    return sortJoined(byFilter);
  }, [joinedGuests, search, listFilter, nameToGroupedInvite]);

  const groupedJoined = useMemo(
    () =>
      sortJoined(
        filteredJoined.filter((g) => nameToGroupedInvite.get(g.name) === true)
      ),
    [filteredJoined, nameToGroupedInvite]
  );

  const individualJoined = useMemo(
    () =>
      sortJoined(
        filteredJoined.filter((g) => nameToGroupedInvite.get(g.name) !== true)
      ),
    [filteredJoined, nameToGroupedInvite]
  );

  const searchExpandIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    const ids = new Set<string>();
    for (const inv of invitations) {
      const memberHit = inv.members.some((m) =>
        m.name.toLowerCase().includes(q)
      );
      const codeHit = inv.code.toLowerCase().includes(q);
      if (memberHit || codeHit) ids.add(inv.id);
    }
    return ids;
  }, [invitations, search]);

  function isExpanded(id: string): boolean {
    if (searchExpandIds.has(id)) return true;
    return expandedIds.has(id);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddPanel() {
    setAddMode(mainTab === "invites" && showInvites ? "invite" : "joined");
    setGuestName("");
    setInviteGuestNames([""]);
    setGroupName("");
    setCode("");
    setError(null);
    setShowAddPanel(true);
  }

  function addInviteGuestRow() {
    setInviteGuestNames((prev) => [...prev, ""]);
  }

  function updateInviteGuestName(index: number, value: string) {
    setInviteGuestNames((prev) =>
      prev.map((name, i) => (i === index ? value : name))
    );
  }

  function removeInviteGuestRow(index: number) {
    setInviteGuestNames((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  const trimmedInviteGuestNames = inviteGuestNames
    .map((n) => n.trim())
    .filter(Boolean);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const isInviteAdd =
      addMode === "invite" && showInvites && mainTab === "invites";
    const names = isInviteAdd
      ? trimmedInviteGuestNames
      : [guestName.trim()].filter(Boolean);

    if (names.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      if (isInviteAdd) {
        const res = await fetch(`/api/admin/${adminToken}/guests/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestNames: names,
            groupName: groupName.trim() || undefined,
            code: code.trim().toUpperCase() || undefined,
          }),
        });

        if (!res.ok) {
          const body = (await res.json()) as { error?: string | object };
          setError(
            typeof body.error === "string"
              ? body.error
              : "Could not add guest."
          );
          return;
        }

        const data = (await res.json()) as { invitation: Invitation };
        setInvitations((prev) => {
          const idx = prev.findIndex((i) => i.id === data.invitation.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.invitation;
            return next;
          }
          return [...prev, data.invitation];
        });
        setExpandedIds((prev) => new Set(prev).add(data.invitation.id));
      } else {
        const res = await fetch(`/api/admin/${adminToken}/guests/joined`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: names[0] }),
        });

        if (!res.ok) {
          const body = (await res.json()) as { error?: string | object };
          setError(
            typeof body.error === "string"
              ? body.error
              : "Could not add guest."
          );
          return;
        }

        const guest = (await res.json()) as JoinedGuest;
        setJoinedGuests((prev) => [...prev, guest]);
      }

      setShowAddPanel(false);
      setGuestName("");
      setInviteGuestNames([""]);
      setGroupName("");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function executeDelete() {
    if (!deleteRequest || deleteLoading) return;

    setDeleteLoading(true);
    setError(null);

    try {
      if (deleteRequest.kind === "invite-member") {
        const { memberId } = deleteRequest;
        const res = await fetch(
          `/api/admin/${adminToken}/guests/invites/members/${memberId}`,
          { method: "DELETE" }
        );

        if (!res.ok && res.status !== 204) {
          setError("Could not remove guest.");
          return;
        }

        setInvitations((prev) =>
          prev
            .map((inv) => ({
              ...inv,
              members: inv.members.filter((m) => m.id !== memberId),
            }))
            .filter((inv) => inv.members.length > 0)
        );
      } else if (deleteRequest.kind === "invite-group") {
        const { invitation } = deleteRequest;
        const res = await fetch(
          `/api/admin/${adminToken}/guests/invites/${invitation.id}`,
          { method: "DELETE" }
        );

        if (!res.ok && res.status !== 204) {
          setError("Could not remove household.");
          return;
        }

        setInvitations((prev) =>
          prev.filter((inv) => inv.id !== invitation.id)
        );
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(invitation.id);
          return next;
        });
      } else {
        const { guestId } = deleteRequest;
        const res = await fetch(
          `/api/admin/${adminToken}/guests/joined/${guestId}`,
          { method: "DELETE" }
        );

        if (!res.ok && res.status !== 204) {
          setError("Could not remove guest.");
          return;
        }

        setJoinedGuests((prev) => prev.filter((g) => g.id !== guestId));
      }

      setDeleteRequest(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  function requestDeleteInviteMember(memberId: string, memberName: string) {
    setDeleteRequest({ kind: "invite-member", memberId, memberName });
  }

  function requestDeleteInviteGroup(invitation: Invitation) {
    setDeleteRequest({ kind: "invite-group", invitation });
  }

  function requestDeleteJoinedGuest(guestId: string, guestName: string) {
    setDeleteRequest({ kind: "joined-guest", guestId, guestName });
  }

  const deleteDialog = (() => {
    if (!deleteRequest) return null;

    if (deleteRequest.kind === "invite-member") {
      return {
        title: "Remove guest from invite list?",
        message: (
          <>
            <strong>{deleteRequest.memberName}</strong> will be removed from the
            invite list. Their invite code may still work for other members in
            the same household.
          </>
        ),
        confirmLabel: "Remove guest",
      };
    }

    if (deleteRequest.kind === "invite-group") {
      const { invitation } = deleteRequest;
      const label = invitation.groupName ?? "this household";
      return {
        title: "Delete entire household?",
        message: (
          <>
            <p>
              Remove <strong>{label}</strong> ({invitation.members.length}{" "}
              {invitation.members.length === 1 ? "guest" : "guests"}) from the
              invite list? Invite code{" "}
              <span className="font-mono">{invitation.code}</span> will stop
              working.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              {invitation.members.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          </>
        ),
        confirmLabel: `Delete ${invitation.members.length} guests`,
      };
    }

    return {
      title: "Remove joined guest?",
      message: (
        <>
          Remove <strong>{deleteRequest.guestName}</strong> from the joined
          guests list? Their uploads will stay in the album.
        </>
      ),
      confirmLabel: "Remove guest",
    };
  })();

  function renderInviteCard(inv: Invitation) {
    const open = isExpanded(inv.id);
    const canDeleteGroup =
      isGroupedInvitation(inv) || inv.members.length > 1;

    return (
      <div
        key={inv.id}
        className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm"
      >
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => toggleExpanded(inv.id)}
            className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors min-w-0"
            aria-expanded={open}
          >
            <span
              className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {inv.groupName ?? "Individual"}
              </p>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{inv.code}</p>
            </div>
            <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
              {inv.members.length}{" "}
              {inv.members.length === 1 ? "guest" : "guests"}
            </span>
          </button>
          {canDeleteGroup && (
            <button
              type="button"
              onClick={() => requestDeleteInviteGroup(inv)}
              className="shrink-0 border-l border-zinc-100 px-3 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete group
            </button>
          )}
        </div>

        {open && (
          <ul className="border-t border-zinc-100 divide-y divide-zinc-50 bg-zinc-50/50">
            {inv.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 pl-11"
              >
                <span className="text-sm text-zinc-800">{member.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    requestDeleteInviteMember(member.id, member.name)
                  }
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function renderIndividualInviteList(rows: IndividualInviteRow[]) {
    if (rows.length === 0) return null;
    return (
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.memberId}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-zinc-900 truncate">{row.name}</p>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{row.code}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                requestDeleteInviteMember(row.memberId, row.name)
              }
              className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderIndividualJoinedList(guests: JoinedGuest[]) {
    if (guests.length === 0) return null;
    return (
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
        {guests.map((guest) => (
          <div
            key={guest.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-zinc-900 truncate">{guest.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Joined {format(new Date(guest.joinedAt), "MMM d, yyyy")}
                {" · "}
                {guest.uploadCount}{" "}
                {guest.uploadCount === 1 ? "upload" : "uploads"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => requestDeleteJoinedGuest(guest.id, guest.name)}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderJoinedCard(guest: JoinedGuest) {
    const cardId = `joined-${guest.id}`;
    const open = isExpanded(cardId);
    return (
      <div
        key={guest.id}
        className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm"
      >
        <button
          type="button"
          onClick={() => toggleExpanded(cardId)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
          aria-expanded={open}
        >
          <span
            className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {guest.name}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {guest.uploadCount}{" "}
              {guest.uploadCount === 1 ? "upload" : "uploads"}
            </p>
          </div>
        </button>

        {open && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 pl-11 flex items-center justify-between gap-3">
            <dl className="text-xs text-zinc-600 space-y-1">
              <div>
                <dt className="inline text-zinc-400">Joined </dt>
                <dd className="inline">
                  {format(new Date(guest.joinedAt), "MMM d, yyyy")}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-400">Uploads </dt>
                <dd className="inline">{guest.uploadCount}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => requestDeleteJoinedGuest(guest.id, guest.name)}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  const totalInviteMembers = invitations.reduce(
    (n, inv) => n + inv.members.length,
    0
  );
  const inviteResultCount = filteredInvitations.length;
  const joinedResultCount = filteredJoined.length;
  const resultCount =
    mainTab === "invites" ? inviteResultCount : joinedResultCount;
  const hasSearch = search.trim().length > 0;

  const filterTabs: { id: ListFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "grouped", label: "Grouped" },
    { id: "individual", label: "Individual" },
  ];

  const mainTabs: { id: MainTab; label: string; count: number }[] = showInvites
    ? [
        { id: "invites", label: "Invite list", count: totalInviteMembers },
        { id: "joined", label: "Joined guests", count: joinedGuests.length },
      ]
    : [{ id: "joined", label: "Joined guests", count: joinedGuests.length }];

  const searchPlaceholder =
    mainTab === "invites"
      ? "Search by name or invite code…"
      : "Search joined guests by name…";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="form-field rounded-xl pl-10"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </div>
        <button
          type="button"
          onClick={openAddPanel}
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + Add guest
        </button>
      </div>

      {showInvites && mainTabs.length > 1 && (
        <div className="flex gap-1 border-b border-zinc-200">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMainTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                mainTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-zinc-400 tabular-nums">
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setListFilter(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              listFilter === tab.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {hasSearch && (
        <p className="text-xs text-zinc-500">
          {resultCount === 0
            ? "No guests match your search."
            : `${resultCount} result${resultCount === 1 ? "" : "s"}`}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          {error}
        </p>
      )}

      {showAddPanel && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Add guest</h2>
            <button
              type="button"
              onClick={() => setShowAddPanel(false)}
              className="text-zinc-400 hover:text-zinc-600 text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            {addMode === "invite" && showInvites && mainTab === "invites" ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="form-label">Group / household</span>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Smith Family"
                    maxLength={100}
                    autoFocus
                    className="form-field"
                  />
                  <span className="form-hint">
                    Optional — groups guests under one invite code
                  </span>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="form-label">Invite code</span>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    placeholder="Auto-generated if blank"
                    maxLength={6}
                    className="form-field-mono"
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <span className="form-label">Guests</span>
                  {inviteGuestNames.map((name, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          updateInviteGuestName(index, e.target.value)
                        }
                        placeholder={`Guest ${index + 1} name`}
                        maxLength={100}
                        className="form-field flex-1"
                      />
                      {inviteGuestNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInviteGuestRow(index)}
                          className="shrink-0 text-zinc-400 hover:text-red-500 px-1 text-lg leading-none"
                          aria-label="Remove guest"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addInviteGuestRow}
                    className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400"
                  >
                    + Add another guest
                  </button>
                </div>
              </>
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className="form-label">Guest name</span>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name"
                  maxLength={100}
                  autoFocus
                  className="form-field"
                />
              </label>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={
                  loading ||
                  (addMode === "invite" && showInvites && mainTab === "invites"
                    ? trimmedInviteGuestNames.length === 0
                    : !guestName.trim())
                }
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading
                  ? "Adding…"
                  : addMode === "invite" &&
                      showInvites &&
                      mainTab === "invites" &&
                      trimmedInviteGuestNames.length > 1
                    ? `Save ${trimmedInviteGuestNames.length} guests`
                    : "Save guest"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddPanel(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {mainTab === "invites" && showInvites && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            {totalInviteMembers} guest
            {totalInviteMembers === 1 ? "" : "s"} on the invite list ·{" "}
            {invitations.length} household
            {invitations.length === 1 ? "" : "s"}
          </p>

          {filteredInvitations.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center rounded-xl border border-dashed border-zinc-200">
              {hasSearch
                ? "No invite list entries match your search."
                : listFilter === "grouped"
                  ? "No grouped households yet."
                  : listFilter === "individual"
                    ? "No individual guests yet."
                    : "No guests on the invite list yet."}
            </p>
          ) : listFilter === "all" ? (
            <div className="flex flex-col gap-5">
              {groupedInvitations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Grouped
                  </h3>
                  <div className="flex flex-col gap-2">
                    {groupedInvitations.map(renderInviteCard)}
                  </div>
                </div>
              )}
              {individualInvitations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Individual
                  </h3>
                  {renderIndividualInviteList(individualInviteRows)}
                </div>
              )}
            </div>
          ) : listFilter === "individual" ? (
            renderIndividualInviteList(individualInviteRows) ?? (
              <p className="text-sm text-zinc-400 py-6 text-center rounded-xl border border-dashed border-zinc-200">
                {hasSearch
                  ? "No individual guests match your search."
                  : "No individual guests yet."}
              </p>
            )
          ) : (
            <div className="flex flex-col gap-2">
              {filteredInvitations.map(renderInviteCard)}
            </div>
          )}
        </section>
      )}

      {mainTab === "joined" && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            {joinedGuests.length} guest
            {joinedGuests.length === 1 ? "" : "s"} have signed in. Removing a
            guest here does not delete their uploads.
          </p>

          {filteredJoined.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center rounded-xl border border-dashed border-zinc-200">
              {hasSearch
                ? "No joined guests match your search."
                : listFilter === "grouped"
                  ? "No joined guests from grouped households."
                  : listFilter === "individual"
                    ? "No individual joined guests yet."
                    : "No guests have signed in yet."}
            </p>
          ) : listFilter === "all" ? (
            <div className="flex flex-col gap-5">
              {groupedJoined.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Grouped
                  </h3>
                  <div className="flex flex-col gap-2">
                    {groupedJoined.map(renderJoinedCard)}
                  </div>
                </div>
              )}
              {individualJoined.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Individual
                  </h3>
                  {renderIndividualJoinedList(individualJoined)}
                </div>
              )}
            </div>
          ) : listFilter === "individual" ? (
            renderIndividualJoinedList(individualJoined)
          ) : (
            <div className="flex flex-col gap-2">
              {groupedJoined.map(renderJoinedCard)}
            </div>
          )}
        </section>
      )}

      {deleteDialog && (
        <ConfirmDialog
          open={Boolean(deleteRequest)}
          title={deleteDialog.title}
          message={deleteDialog.message}
          confirmLabel={deleteDialog.confirmLabel}
          loading={deleteLoading}
          onConfirm={executeDelete}
          onCancel={() => {
            if (!deleteLoading) setDeleteRequest(null);
          }}
        />
      )}
    </div>
  );
}
