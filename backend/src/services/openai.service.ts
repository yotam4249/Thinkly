// src/services/openai.service.ts
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("[openai] OPENAI_API_KEY is missing in environment");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askOpenAIQuestion(question: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a concise, helpful teaching assistant." },
      { role: "user", content: question },
    ],
  });
  const ans = completion.choices?.[0]?.message?.content?.trim() ?? "";
  return ans;
}

export async function generateOpenAIQuiz(topic: string, level: string) {
  const sys =
    "You are a teaching assistant. Produce a short quiz as strict JSON with fields: topic, level, items[]. " +
    "Each item: { id, type: 'mcq'|'open', question, options? (4 strings for mcq), answer }. " +
    "Keep it to 5 items. No extra commentary.";
  const user = `Create a ${level} difficulty quiz about "${topic}". JSON only.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices?.[0]?.message?.content ?? "{}";
  return content;
}
