/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { streamChat } from "../../services/ai.services";
import "../../styles/ai.css";

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };
type QuizStage = "idle" | "confirm" | "topic" | "difficulty" | "ready";

const SYSTEM_PROMPT = `
You are a friendly AI teaching assistant.
You help learners by explaining topics clearly and offering short quizzes to test understanding.
When a user agrees to take a quiz:
1. Ask what topic they want.
2. Then ask for the difficulty level (Easy, Intermediate, Hard, or Expert).
3. When both are given, prepare a quiz.
`;

export function AiAgentPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "sys", role: "system", content: SYSTEM_PROMPT },
    {
      id: "init",
      role: "assistant",
      content:
        "Hi! I'm your learning assistant 📘 Would you like to take a short quiz to test your knowledge?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizStage, setQuizStage] = useState<QuizStage>("confirm");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizLevel, setQuizLevel] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const cleanHistory = ([...messages, userMsg]
        .filter((m) => m.role !== "system")
        .map(({ role, content }) => ({ role, content }))) as {
        role: "user" | "assistant";
        content: string;
      }[];

      const { reader } = await streamChat(cleanHistory);

      let assistant: Msg = { id: crypto.randomUUID(), role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistant]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant = { ...assistant, content: assistant.content + decoder.decode(value) };
        setMessages((prev) => prev.map((m) => (m.id === assistant.id ? assistant : m)));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Sorry, I couldn't reach the AI right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // --- QUIZ FLOW LOGIC --- //

  const handleQuizAction = (choice: "yes" | "no") => {
    if (choice === "no") {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "No problem! You can start a quiz anytime later." },
      ]);
      setQuizStage("idle");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: "Awesome! What topic would you like the quiz to be about?" },
    ]);
    setQuizStage("topic");
  };

  const handleSubmitTopic = (text: string) => {
    setQuizTopic(text);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Great! Now choose a difficulty level:",
      },
    ]);
    setQuizStage("difficulty");
  };

  const handleSelectDifficulty = (level: string) => {
    setQuizLevel(level);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: level },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Perfect! I'll prepare a ${level} quiz about ${quizTopic}. Ready to start?`,
      },
    ]);
    setQuizStage("ready");
  };

  const handleManualInput = () => {
    if (quizStage === "topic") {
      handleSubmitTopic(input.trim());
      setInput("");
    } else {
      onSend();
    }
  };

  return (
    <div className="ai-root">
      <header className="ai-header">
        <div>
          <div className="ai-title">AI Teaching Assistant</div>
          <div className="ai-sub">Ask, learn, or start a quiz anytime</div>
        </div>
      </header>

      <div className="ai-list" ref={listRef}>
        {messages
          .filter((m) => m.role !== "system")
          .map((m) => (
            <div key={m.id} className={`ai-msg ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
        {loading && (
          <div className="ai-msg assistant">
            <div className="bubble bubble-pending">
              <span className="dots">
                <i></i><i></i><i></i>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* YES/NO prompt */}
      {quizStage === "confirm" && (
        <div className="ai-quiz-buttons">
          <button onClick={() => handleQuizAction("yes")} className="btn btn-primary">
            Yes
          </button>
          <button onClick={() => handleQuizAction("no")} className="btn">
            No
          </button>
        </div>
      )}

      {/* Difficulty selection */}
      {quizStage === "difficulty" && (
        <div className="ai-quiz-buttons difficulty">
          {["Easy", "Intermediate", "Hard", "Expert"].map((lvl) => (
            <button key={lvl} onClick={() => handleSelectDifficulty(lvl)} className="btn btn-diff">
              {lvl}
            </button>
          ))}
        </div>
      )}

      {/* Input bar (always visible) */}
      <form
        className="ai-composer"
        onSubmit={(e) => {
          e.preventDefault();
          handleManualInput();
        }}
      >
        <input
          className="ai-input"
          placeholder={
            quizStage === "topic"
              ? "Type a topic for your quiz..."
              : "Ask or chat with your tutor…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="ai-send" type="submit" disabled={!input.trim() || loading}>
          Send
        </button>
      </form>
    </div>
  );
}
