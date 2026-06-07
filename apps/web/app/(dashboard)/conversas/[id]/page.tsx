"use client";

import { useParams } from "next/navigation";
import { Inbox } from "@/components/inbox";

export default function ConversaDetailPage() {
  const { id } = useParams();
  return (
    <div className="h-full">
      <Inbox initialId={typeof id === "string" ? id : undefined} />
    </div>
  );
}
