/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { askQuestion, getQuiz, type QuizPayload } from "../../services/ai.services";
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

function newId() {
  return (globalThis?.crypto?.randomUUID?.() as string) || "id-" + Math.random().toString(36).slice(2);
}

export function AiAgentPanel() {
  console.log("[FE] AiAgentPanel mounted");

  const [messages, setMessages] = useState<Msg[]>([
    { id: "sys", role: "system", content: SYSTEM_PROMPT },
    { id: "greet", role: "assistant", content: "How can I help you today?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizStage, setQuizStage] = useState<QuizStage>("idle");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizLevel, setQuizLevel] = useState("");
  const [lastQuiz, setLastQuiz] = useState<QuizPayload | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Scroll chat to bottom when messages update
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages]);

  // ✅ Log lastQuiz answers once it's updated (type-safe)
  useEffect(() => {
    if (lastQuiz) {
      console.log(
        "[FE] lastQuiz answers =>",
        lastQuiz.items.map((it, i) => ({
          i,
          correctIndex: it.correctIndex,
          correct: it.options[it.correctIndex],
        }))
      );
    }
  }, [lastQuiz]);

  // ----- Regular Q&A -----
  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    if (quizStage !== "topic") setQuizStage("idle");

    const userMsg: Msg = { id: newId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    console.log("[FE] onSend →", text);

    try {
      const { cached, answer } = await askQuestion(text);
      console.log("[FE] onSend result:", { cached, answerLen: answer?.length });
      const suffix = cached ? " (from cache)" : "";
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: answer + suffix }]);
    } catch (err: any) {
      console.error("[FE] onSend error:", err?.message || err);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "Sorry, I couldn't reach the AI right now." },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom("auto");
    }
  }

  // ----- QUIZ FLOW -----
  const handleStartQuiz = () => {
    console.log("[FE] StartQuiz clicked");
    setQuizStage("confirm");
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "assistant", content: "Would you like to take a short quiz to test your knowledge?" },
    ]);
    scrollToBottom("auto");
  };

  const handleQuizAction = (choice: "yes" | "no") => {
    console.log("[FE] QuizAction:", choice);
    if (choice === "no") {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "No problem! You can start a quiz anytime later." },
      ]);
      setQuizStage("idle");
      scrollToBottom("auto");
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "assistant", content: "Awesome! What topic would you like the quiz to be about?" },
    ]);
    setQuizStage("topic");
    scrollToBottom("auto");
  };

  const handleSubmitTopic = (text: string) => {
    const t = text.trim();
    if (!t) return;
    console.log("[FE] SubmitTopic:", t);

    setQuizTopic(t);
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: t },
      { id: newId(), role: "assistant", content: "Great! Now choose a difficulty level:" },
    ]);
    setQuizStage("difficulty");
    scrollToBottom("auto");
  };

  const handleSelectDifficulty = (level: string) => {
    console.log("[FE] SelectDifficulty:", level);
    setQuizLevel(level);
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: level },
      { id: newId(), role: "assistant", content: `Perfect! I'll prepare a ${level} quiz about ${quizTopic}. Ready to start?` },
    ]);
    setQuizStage("ready");
    scrollToBottom("auto");
  };

  const handleQuizActionFinal = async (choice: "yes" | "no") => {
    console.log("[FE] QuizActionFinal:", choice);
    if (choice === "no") {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "No worries! Let me know whenever you're ready to begin." },
      ]);
      setQuizStage("idle");
      scrollToBottom("auto");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "assistant", content: `Great! Generating your ${quizLevel} quiz on ${quizTopic}...` },
    ]);
    setQuizStage("idle");

    try {
      const { cached, quiz } = await getQuiz(quizTopic, quizLevel);
      console.log("[FE] getQuiz result:", {
        cached,
        topic: quiz.topic,
        level: quiz.level,
        count: quiz.items?.length,
        answers: quiz.items?.map((it) => it.correctIndex),
      });

      setLastQuiz(quiz);

      const pretty = renderQuizAsText(quiz, cached);
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: pretty }]);
    } catch (err: any) {
      console.error("[FE] getQuiz error:", err?.message || err);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "Sorry, I couldn't generate the quiz right now." },
      ]);
    } finally {
      scrollToBottom("auto");
    }
  };

  const handleManualInput = () => {
    if (quizStage === "topic") {
      const t = input.trim();
      if (!t) return;
      handleSubmitTopic(t);
      setInput("");
    } else {
      onSend();
    }
  };

  return (
    <div className="ai-root">
      <header className="ai-header">
        <div><div className="ai-title">AI Teaching Assistant</div></div>
        {(quizStage === "idle" || quizStage === "confirm") && (
          <button className="btn btn-primary" onClick={handleStartQuiz}>Start Quiz</button>
        )}
      </header>

      <div className="ai-list" ref={listRef}>
        {messages.filter((m) => m.role !== "system").map((m) => (
          <div key={m.id} className={`ai-msg ${m.role}`}>
            <div className="bubble" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}

        {quizStage === "confirm" && (
          <div className="ai-quiz-buttons">
            <button onClick={() => handleQuizAction("yes")} className="btn btn-primary">Yes</button>
            <button onClick={() => handleQuizAction("no")} className="btn">No</button>
          </div>
        )}

        {quizStage === "difficulty" && (
          <div className="ai-quiz-buttons difficulty">
            {["Easy", "Intermediate", "Hard", "Expert"].map((lvl) => (
              <button key={lvl} onClick={() => handleSelectDifficulty(lvl)} className="btn btn-diff">
                {lvl}
              </button>
            ))}
          </div>
        )}

        {quizStage === "ready" && (
          <div className="ai-quiz-buttons">
            <button onClick={() => handleQuizActionFinal("yes")} className="btn btn-primary">Yes</button>
            <button onClick={() => handleQuizActionFinal("no")} className="btn">No</button>
          </div>
        )}

        {loading && (
          <div className="ai-msg assistant">
            <div className="bubble bubble-pending">
              <span className="dots"><i></i><i></i><i></i></span>
            </div>
          </div>
        )}
      </div>

      <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); handleManualInput(); }}>
        <input
          className="ai-input"
          placeholder={quizStage === "topic" ? "Type a topic for your quiz..." : "Ask or chat with your tutor…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="ai-send" type="submit" disabled={!input.trim() || loading}>Send</button>
      </form>
    </div>
  );
}

// Render quiz as formatted text
function renderQuizAsText(quiz: QuizPayload, cached: boolean) {
  const header = `Here is your ${quiz.level} quiz on ${quiz.topic}${cached ? " (from cache)" : ""}:`;
  const lines = quiz.items.map((it, idx) => {
    const q = `${idx + 1}. ${it.question}`;
    const opts = it.options.map((o, i) => `   ${String.fromCharCode(65 + i)}. ${o}`).join("\n");
    return `${q}\n${opts}`;
  });
  return [header, ...lines, "Reply with your answers (e.g., A B C D E) and I’ll check them!"].join("\n");
}
