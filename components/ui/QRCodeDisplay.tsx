"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 160 }: QRCodeDisplayProps) {
  return (
    <div className="inline-block rounded-xl border border-zinc-200 bg-white p-3">
      <QRCodeSVG value={value} size={size} />
    </div>
  );
}
