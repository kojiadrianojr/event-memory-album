"use client";

import { useState } from "react";

interface AdminPromptsManagerProps {
  accessToken: string;
  adminToken: string;
  initialPrompts: {
    id: string;
    text: string;
    sortOrder: number;
    isActive: boolean;
  }[];
}

export default function AdminPromptsManager({
  accessToken,
  adminToken,
  initialPrompts,
}: AdminPromptsManagerProps) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);

  async function addPrompt() {
    const text = newText.trim();
    if (!text || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${accessToken}/prompts/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const prompt = await res.json();
        setPrompts((prev) => [...prev, prompt]);
        setNewText("");
      }
    } finally {
      setLoading(false);
    }
  }

  async function togglePrompt(id: string, isActive: boolean) {
    const res = await fetch(`/api/events/${accessToken}/prompts/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
      },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
    }
  }

  async function deletePrompt(id: string) {
    if (!confirm("Delete this photo challenge?")) return;
    const res = await fetch(`/api/events/${accessToken}/prompts/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Token": adminToken },
    });
    if (res.ok || res.status === 204) {
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <div
          key={prompt.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
        >
          <span
            className={`text-sm flex-1 ${prompt.isActive ? "text-zinc-800" : "text-zinc-400 line-through"}`}
          >
            {prompt.text}
          </span>
          <button
            onClick={() => togglePrompt(prompt.id, prompt.isActive)}
            className="text-xs text-zinc-600 hover:text-zinc-800"
          >
            {prompt.isActive ? "Hide" : "Show"}
          </button>
          <button
            onClick={() => deletePrompt(prompt.id)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="e.g. Catch the first dance"
          maxLength={200}
          className="flex-1 form-field"
        />
        <button
          onClick={addPrompt}
          disabled={loading || !newText.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
