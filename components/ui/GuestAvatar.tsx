const AVATAR_COLORS = [
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-indigo-400",
  "bg-violet-400",
  "bg-pink-400",
] as const;

export function guestInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function guestAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface GuestAvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export default function GuestAvatar({
  name,
  size = "md",
  className = "",
}: GuestAvatarProps) {
  const sizeClass =
    size === "xs"
      ? "h-5 w-5 text-[9px]"
      : size === "sm"
        ? "h-7 w-7 text-xs"
        : size === "lg"
          ? "h-14 w-14 text-lg"
          : "h-9 w-9 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none ${guestAvatarColor(name)} ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {guestInitials(name)}
    </div>
  );
}
