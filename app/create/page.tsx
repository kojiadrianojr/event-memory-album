"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import {
  InviteListBuilder,
  type InviteRow,
} from "@/components/ui/InviteListBuilder";
import { generateEventCode } from "@/lib/event-code";
import {
  createEventSchema,
  inviteCodeSchema,
} from "@/lib/validations";

type AccessMode = "INVITE_ONLY" | "EVENT_CODE" | "BOTH";

type FormValues = {
  name: string;
  hostName: string;
  eventDate: string;
  description: string;
  accessMode: AccessMode;
  eventCode: string;
};

type SuccessData = {
  accessMode: AccessMode;
  eventCode: string | null;
  accessToken: string;
  viewToken: string;
  adminToken: string;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="readonly-url-field flex-1 text-sm"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  INVITE_ONLY: "Personal invite only",
  EVENT_CODE: "Event code only",
  BOTH: "Personal invite and event code",
};

export default function CreatePage() {
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      accessMode: "INVITE_ONLY",
      eventCode: generateEventCode(),
    },
  });

  const accessMode = watch("accessMode") as AccessMode;
  const showEventCode =
    accessMode === "EVENT_CODE" || accessMode === "BOTH";
  const showInvites =
    accessMode === "INVITE_ONLY" || accessMode === "BOTH";

  useEffect(() => {
    if (showEventCode) {
      const current = watch("eventCode");
      if (!current) setValue("eventCode", generateEventCode());
    }
  }, [showEventCode, setValue, watch]);

  async function onSubmit(data: FormValues) {
    setServerError(null);

    const invitations = showInvites
      ? inviteRows
          .filter((r) => r.guestName.trim() && r.code.trim())
          .map((r) => ({
            groupName: r.groupName.trim() || undefined,
            guestName: r.guestName.trim(),
            code: r.code.trim().toUpperCase(),
          }))
      : [];

    for (const row of invitations) {
      if (!inviteCodeSchema.safeParse(row.code).success) {
        setServerError(
          `Invite code "${row.code}" must be 6 uppercase alphanumeric characters.`
        );
        return;
      }
    }

    const payload = {
      name: data.name,
      hostName: data.hostName,
      description: data.description || undefined,
      eventDate: data.eventDate
        ? new Date(data.eventDate).toISOString()
        : undefined,
      accessMode: data.accessMode,
      eventCode: showEventCode ? data.eventCode.trim().toUpperCase() : undefined,
      invitations: invitations.length > 0 ? invitations : undefined,
    };

    const parsed = createEventSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const first =
        fieldErrors.invitations?.[0] ??
        fieldErrors.eventCode?.[0] ??
        fieldErrors.accessMode?.[0];
      setServerError(first ?? "Please check your inputs and try again.");
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string | object };
        if (typeof body.error === "string") {
          setServerError(body.error);
        } else {
          setServerError("Failed to create event. Please try again.");
        }
        return;
      }

      const result = (await res.json()) as SuccessData;
      setSuccess(result);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    }
  }

  if (success) {
    const origin = window.location.origin;
    const guestUrl = `${origin}/event/${success.accessToken}`;
    const viewUrl = `${origin}/view/${success.viewToken}`;
    const adminUrl = `${origin}/admin/${success.adminToken}`;

    return (
      <main className="min-h-screen bg-zinc-50 flex items-start justify-center py-16 px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 flex flex-col gap-8">
          <div className="text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h1 className="text-2xl font-bold text-zinc-900">Event Created!</h1>
            <p className="mt-1 text-zinc-500 text-sm">
              Share the link or QR code with your guests.
            </p>
          </div>

          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-700 space-y-1">
            <p>
              <span className="font-medium">Access:</span>{" "}
              {ACCESS_MODE_LABELS[success.accessMode]}
            </p>
            {success.eventCode && (
              <p>
                <span className="font-medium">Event code:</span>{" "}
                <span className="font-mono">{success.eventCode}</span>
              </p>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-zinc-700">Guest Upload QR</p>
              <div className="p-4 bg-white border border-zinc-200 rounded-xl">
                <QRCodeSVG value={guestUrl} size={140} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-zinc-700">View Only QR</p>
              <div className="p-4 bg-white border border-zinc-200 rounded-xl">
                <QRCodeSVG value={viewUrl} size={140} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {success.eventCode && (
              <CopyField label="Event Code (guest login)" value={success.eventCode} />
            )}
            <CopyField label="Guest Link (upload)" value={guestUrl} />
            <CopyField label="View Only Link" value={viewUrl} />
            <CopyField label="Admin Link" value={adminUrl} />
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Save your admin link!</strong> It won&apos;t be shown again
            after you leave this page.
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={guestUrl}
              className="text-center rounded-xl bg-zinc-900 py-3 px-6 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Go to Event →
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={adminUrl}
                className="text-center rounded-xl border border-zinc-200 py-3 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Open Admin Dashboard
              </Link>
              <Link
                href={viewUrl}
                className="text-center rounded-xl border border-zinc-200 py-3 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Open View-only Gallery
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 flex flex-col gap-6">
        <div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600">
            ← Back
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">
            Create an Event
          </h1>
          <p className="mt-1 text-zinc-500 text-sm">
            Set up your private photo album in seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-zinc-700"
            >
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Sophie & Tom's Wedding"
              {...register("name", { required: "Event name is required" })}
              className="form-field"
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hostName"
              className="text-sm font-medium text-zinc-700"
            >
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="hostName"
              type="text"
              placeholder="Sophie"
              {...register("hostName", { required: "Your name is required" })}
              className="form-field"
            />
            {errors.hostName && (
              <p className="text-xs text-red-500">{errors.hostName.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="eventDate"
              className="text-sm font-medium text-zinc-700"
            >
              Event Date
            </label>
            <input
              id="eventDate"
              type="date"
              {...register("eventDate")}
              className="form-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-sm font-medium text-zinc-700"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="A short note for your guests…"
              {...register("description")}
              className="form-field resize-none"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-700">
              Guest access
            </legend>
            {(
              [
                ["INVITE_ONLY", "Personal invite only"],
                ["EVENT_CODE", "Event code only"],
                ["BOTH", "Both personal invite and event code"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 shadow-sm cursor-pointer hover:bg-zinc-50"
              >
                <input
                  type="radio"
                  value={value}
                  {...register("accessMode")}
                  className="accent-zinc-800"
                />
                <span className="text-sm text-zinc-800">{label}</span>
              </label>
            ))}
          </fieldset>

          {showEventCode && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="eventCode"
                className="text-sm font-medium text-zinc-700"
              >
                Event code
              </label>
              <input
                id="eventCode"
                type="text"
                maxLength={12}
                {...register("eventCode")}
                onChange={(e) =>
                  setValue(
                    "eventCode",
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                  )
                }
                className="form-field-mono"
              />
              <p className="text-xs text-zinc-500">
                Guests enter this code on the home page with their name. 4–12
                uppercase letters or numbers.
              </p>
            </div>
          )}

          {showInvites && (
            <InviteListBuilder rows={inviteRows} onChange={setInviteRows} />
          )}

          {serverError && (
            <p className="text-sm text-red-500">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-zinc-900 py-3 px-6 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Creating…" : "Create Event"}
          </button>
        </form>
      </div>
    </main>
  );
}
