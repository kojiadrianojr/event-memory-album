"use client";

import { useRouter } from "next/navigation";
import { switchGuest } from "@/lib/switch-guest";

interface SwitchGuestButtonProps {
  eventId: string;
  className?: string;
}

export default function SwitchGuestButton({
  eventId,
  className = "text-xs text-zinc-400 hover:text-zinc-600 underline-offset-2 hover:underline",
}: SwitchGuestButtonProps) {
  const router = useRouter();

  async function handleClick() {
    await switchGuest(eventId);
    router.push("/");
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      Not you?
    </button>
  );
}
