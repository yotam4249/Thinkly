// src/services/ai.services.ts

// ----- Q&A (cache-first) -----
export async function askQuestion(
  question: string
): Promise<{ cached: boolean; answer: string }> {
  const res = await fetch("/api/ai/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Q&A failed: ${res.status} ${text}`);
  }
  return res.json();
}

// ----- Quiz (cache-first) -----
export type QuizItem = {
  id: string;
  type: "mcq" | "open";
  question: string;
  options?: string[];
  answer: string;
};
export type QuizPayload = {
  topic: string;
  level: string;
  items: QuizItem[];
};

export async function getQuiz(
  topic: string,
  level: string
): Promise<{ cached: boolean; quiz: QuizPayload }> {
  const res = await fetch("/api/ai/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, level }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Quiz generation failed: ${res.status} ${text}`);
  }
  return res.json();
}
