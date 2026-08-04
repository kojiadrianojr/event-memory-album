import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function ViewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ viewToken: string }>;
}) {
  const { viewToken } = await params;

  const event = await db.event.findUnique({
    where: { viewToken },
  });

  if (!event) {
    redirect("/?error=invalid-token");
  }

  return <>{children}</>;
}
