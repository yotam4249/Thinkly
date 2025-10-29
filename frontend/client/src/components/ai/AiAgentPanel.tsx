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
    { id: "greet", role: "assistant", content: "How can I help you today?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Start in IDLE (no yes/no until Start Quiz is pressed)
  const [quizStage, setQuizStage] = useState<QuizStage>("idle");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizLevel, setQuizLevel] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  /** Always scroll the list to bottom */
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  };

  // Safety: whenever messages change, keep scrolled to bottom
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // If user types during quiz flow, follow the user and reset flow
    // (except when in 'topic' stage we treat the input as the topic)
    if (quizStage !== "topic") {
      setQuizStage("idle");
    }

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    scrollToBottom("auto");
    setLoading(true);

    try {
      const cleanHistory = ([...messages, userMsg]
        .filter((m) => m.role !== "system")
        .map(({ role, content }) => ({ role, content }))) as {
        role: "user" | "assistant";
        content: string;
      }[];

      const { reader } = await streamChat(cleanHistory);

      // create an empty assistant message to stream into
      let assistant: Msg = { id: crypto.randomUUID(), role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistant]);
      scrollToBottom("auto");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistant = {
          ...assistant,
          content: assistant.content + decoder.decode(value),
        };

        setMessages((prev) => prev.map((m) => (m.id === assistant.id ? assistant : m)));
        scrollToBottom("auto");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Sorry, I couldn't reach the AI right now." },
      ]);
      scrollToBottom("auto");
    } finally {
      setLoading(false);
    }
  }

  // --- QUIZ FLOW ---

  const handleStartQuiz = () => {
    // Show confirm prompt only AFTER user clicked Start Quiz
    setQuizStage("confirm");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Would you like to take a short quiz to test your knowledge?",
      },
    ]);
    scrollToBottom("auto");
  };

  const handleQuizAction = (choice: "yes" | "no") => {
    if (choice === "no") {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "No problem! You can start a quiz anytime later." },
      ]);
      setQuizStage("idle"); // back to idle; Start Quiz button visible again
      scrollToBottom("auto");
      return;
    }
    // yes → ask for topic
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Awesome! What topic would you like the quiz to be about?",
      },
    ]);
    setQuizStage("topic");
    scrollToBottom("auto");
  };

  const handleSubmitTopic = (text: string) => {
    // Guard: if empty, ignore
    const t = text.trim();
    if (!t) return;

    setQuizTopic(t);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: t },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Great! Now choose a difficulty level:",
      },
    ]);
    setQuizStage("difficulty");
    scrollToBottom("auto");
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
    // after this, show yes/no again
    setQuizStage("ready");
    scrollToBottom("auto");
  };

  const handleQuizActionFinal = (choice: "yes" | "no") => {
    if (choice === "no") {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "No worries! Let me know whenever you're ready to begin.",
        },
      ]);
      setQuizStage("idle"); // show Start Quiz again
      scrollToBottom("auto");
      return;
    }

    // Placeholder for starting the actual quiz
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Great! Let's start your ${quizLevel} quiz on ${quizTopic}!`,
      },
    ]);
    setQuizStage("idle"); // reset flow; Start Quiz button available again
    scrollToBottom("auto");
  };

  /** Input handler that respects quiz flow */
  const handleManualInput = () => {
    if (quizStage === "topic") {
      const t = input.trim();
      if (!t) return;
      handleSubmitTopic(t);
      setInput("");
    } else {
      onSend(); // any other stage → follow the user and reset quiz flow inside onSend
    }
  };

  return (
    <div className="ai-root">
      <header className="ai-header">
        <div>
          <div className="ai-title">AI Teaching Assistant</div>
          <div className="ai-sub">Ask, learn, or start a quiz anytime</div>
        </div>

        {/* Start Quiz button visible in idle or confirm (lets user re-open) */}
        {(quizStage === "idle" || quizStage === "confirm") === true && (
          <button className="btn btn-primary" onClick={handleStartQuiz}>
            Start Quiz
          </button>
        )}
      </header>

      <div className="ai-list" ref={listRef}>
        {messages
          .filter((m) => m.role !== "system")
          .map((m) => (
            <div key={m.id} className={`ai-msg ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

        {/* Yes/No only AFTER clicking Start Quiz */}
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

        {/* Yes/No after “Ready to start?” */}
        {quizStage === "ready" && (
          <div className="ai-quiz-buttons">
            <button onClick={() => handleQuizActionFinal("yes")} className="btn btn-primary">
              Yes
            </button>
            <button onClick={() => handleQuizActionFinal("no")} className="btn">
              No
            </button>
          </div>
        )}

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
