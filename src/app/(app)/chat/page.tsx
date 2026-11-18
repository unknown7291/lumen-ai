import { getCurrentUser } from "@/lib/auth";
import { ChatInterface } from "@/components/chat-interface";

export const dynamic = "force-dynamic";

export default async function ChatHome() {
  const user = await getCurrentUser();
  return <ChatInterface name={user?.name || "there"} mode={user?.mode || "local"} />;
}
