// simple streaming client for the AI endpoint
type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

export async function streamChat(history: Msg[]) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });
  if (!res.ok || !res.body) throw new Error("AI request failed");
  const reader = res.body.getReader();
  return { reader };
}
