"use client";

import { useState } from "react";

interface AdminMomentsManagerProps {
  accessToken: string;
  adminToken: string;
  initialMoments: { id: string; name: string; sortOrder: number }[];
}

export default function AdminMomentsManager({
  accessToken,
  adminToken,
  initialMoments,
}: AdminMomentsManagerProps) {
  const [moments, setMoments] = useState(initialMoments);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  async function addMoment() {
    const name = newName.trim();
    if (!name || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${accessToken}/moments/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const moment = await res.json();
        setMoments((prev) => [...prev, moment]);
        setNewName("");
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteMoment(id: string) {
    if (!confirm("Delete this moment? Media will be unassigned.")) return;
    const res = await fetch(`/api/events/${accessToken}/moments/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Token": adminToken },
    });
    if (res.ok || res.status === 204) {
      setMoments((prev) => prev.filter((m) => m.id !== id));
    }
  }

  return (
    <div className="space-y-3">
      {moments.map((moment) => (
        <div
          key={moment.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
        >
          <span className="text-sm text-zinc-800">{moment.name}</span>
          <button
            onClick={() => deleteMoment(moment.id)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New moment name"
          maxLength={100}
          className="flex-1 form-field"
        />
        <button
          onClick={addMoment}
          disabled={loading || !newName.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
