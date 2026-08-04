"use client";

import { useCallback, useRef, useState } from "react";
import {
  flattenInviteGroups,
  parseInviteImportText,
  type InviteImportRow,
} from "@/lib/invite-import";

export type InviteRow = InviteImportRow;

type Props = {
  rows: InviteRow[];
  onChange: (rows: InviteRow[]) => void;
};

function emptyRow(): InviteRow {
  return { groupName: "", guestName: "", code: "" };
}

export function InviteListBuilder({ rows, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const updateRow = useCallback(
    (index: number, patch: Partial<InviteRow>) => {
      const next = rows.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      );
      onChange(next);
    },
    [rows, onChange]
  );

  function addRow() {
    onChange([...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { groups, errors } = parseInviteImportText(text);
    setImportErrors(errors.map((err) => `Line ${err.line}: ${err.message}`));

    if (groups.length > 0) {
      onChange(flattenInviteGroups(groups));
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-700">Guest invites</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline"
          >
            Upload list
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/plain,text/csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        <p className="text-xs text-zinc-500">
          One row per guest. Upload a CSV with columns{" "}
          <code className="font-mono">groupName,guestName,code</code> (or the
          5-column <code className="font-mono">list,id,groupName,guestName,code</code>
          format), or type rows manually. Same code = same household.
        </p>
      </div>

      {importErrors.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-1">
          {importErrors.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            No guests yet. Add a row or upload a list.
          </p>
        ) : (
          rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_88px_auto] gap-2 items-center"
            >
              <input
                type="text"
                value={row.groupName}
                onChange={(e) =>
                  updateRow(index, { groupName: e.target.value })
                }
                placeholder="Group / household"
                className="form-field text-xs py-2"
              />
              <input
                type="text"
                value={row.guestName}
                onChange={(e) =>
                  updateRow(index, { guestName: e.target.value })
                }
                placeholder="Guest name"
                className="form-field text-xs py-2"
              />
              <input
                type="text"
                value={row.code}
                onChange={(e) =>
                  updateRow(index, {
                    code: e.target.value.toUpperCase().slice(0, 6),
                  })
                }
                placeholder="CODE"
                maxLength={6}
                className="form-field-mono text-xs py-2 text-center"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-zinc-400 hover:text-red-500 text-sm px-1"
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
      >
        + Add guest
      </button>
    </div>
  );
}
