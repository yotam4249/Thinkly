// /* eslint-disable @typescript-eslint/no-unused-vars */
// import { useEffect, useRef, useState } from "react";
// import { streamChat, reportQuestion, reportQuizStart } from "../../services/ai.services";
// import "../../styles/ai.css";

// type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };
// type QuizStage = "idle" | "confirm" | "topic" | "difficulty" | "ready";

// const SYSTEM_PROMPT = `
// You are a friendly AI teaching assistant.
// You help learners by explaining topics clearly and offering short quizzes to test understanding.
// When a user agrees to take a quiz:
// 1. Ask what topic they want.
// 2. Then ask for the difficulty level (Easy, Intermediate, Hard, or Expert).
// 3. When both are given, prepare a quiz.
// `;

// // Safe ID generator across browsers
// function newId() {
//   return (globalThis?.crypto?.randomUUID?.() as string) || "id-" + Math.random().toString(36).slice(2);
// }

// export function AiAgentPanel() {
//   const [messages, setMessages] = useState<Msg[]>([
//     { id: "sys", role: "system", content: SYSTEM_PROMPT },
//     { id: "greet", role: "assistant", content: "How can I help you today?" },
//   ]);

//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Start in IDLE (no yes/no until Start Quiz is pressed)
//   const [quizStage, setQuizStage] = useState<QuizStage>("idle");
//   const [quizTopic, setQuizTopic] = useState("");
//   const [quizLevel, setQuizLevel] = useState("");
//   const listRef = useRef<HTMLDivElement | null>(null);

//   /** Always scroll the list to bottom */
//   const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
//     const el = listRef.current;
//     if (!el) return;
//     // Use rAF to ensure DOM is painted before jump
//     requestAnimationFrame(() => {
//       // when content grows, stick to very bottom
//       el.scrollTo({ top: el.scrollHeight, behavior });
//     });
//   };

//   // Keep view pinned to bottom as messages stream in
//   useEffect(() => {
//     scrollToBottom("smooth");
//   }, [messages]);

//   async function onSend(e?: React.FormEvent) {
//     e?.preventDefault();
//     const text = input.trim();
//     if (!text || loading) return;

//     // Telemetry: record free-form question
//     reportQuestion(text);

//     // If the user types during flow, reset to idle (except when we're asking for topic)
//     if (quizStage !== "topic") {
//       setQuizStage("idle");
//     }

//     const userMsg: Msg = { id: newId(), role: "user", content: text };
//     setMessages((prev) => [...prev, userMsg]);
//     setInput("");
//     scrollToBottom("auto");
//     setLoading(true);

//     try {
//       // Build clean history for the AI (exclude system message)
//       const cleanHistory = ([...messages, userMsg]
//         .filter((m) => m.role !== "system")
//         .map(({ role, content }) => ({ role: role as "user" | "assistant", content })));

//       const { reader } = await streamChat(cleanHistory);

//       // create an empty assistant message to stream into
//       let assistant: Msg = { id: newId(), role: "assistant", content: "" };
//       setMessages((prev) => [...prev, assistant]);
//       scrollToBottom("auto");

//       const decoder = new TextDecoder();
//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         assistant = {
//           ...assistant,
//           content: assistant.content + decoder.decode(value),
//         };

//         setMessages((prev) => prev.map((m) => (m.id === assistant.id ? assistant : m)));
//         scrollToBottom("auto");
//       }
//     } catch {
//       setMessages((prev) => [
//         ...prev,
//         { id: newId(), role: "assistant", content: "Sorry, I couldn't reach the AI right now." },
//       ]);
//       scrollToBottom("auto");
//     } finally {
//       setLoading(false);
//     }
//   }

//   // --- QUIZ FLOW ---

//   /** Show confirm prompt only AFTER user clicked Start Quiz */
//   const handleStartQuiz = () => {
//     setQuizStage("confirm");
//     setMessages((prev) => [
//       ...prev,
//       {
//         id: newId(),
//         role: "assistant",
//         content: "Would you like to take a short quiz to test your knowledge?",
//       },
//     ]);
//     scrollToBottom("auto");
//   };

//   const handleQuizAction = (choice: "yes" | "no") => {
//     if (choice === "no") {
//       setMessages((prev) => [
//         ...prev,
//         { id: newId(), role: "assistant", content: "No problem! You can start a quiz anytime later." },
//       ]);
//       setQuizStage("idle"); // back to idle; Start Quiz button visible again
//       scrollToBottom("auto");
//       return;
//     }
//     // yes → ask for topic
//     setMessages((prev) => [
//       ...prev,
//       {
//         id: newId(),
//         role: "assistant",
//         content: "Awesome! What topic would you like the quiz to be about?",
//       },
//     ]);
//     setQuizStage("topic");
//     scrollToBottom("auto");
//   };

//   const handleSubmitTopic = (text: string) => {
//     const t = text.trim();
//     if (!t) return;

//     setQuizTopic(t);
//     setMessages((prev) => [
//       ...prev,
//       { id: newId(), role: "user", content: t },
//       {
//         id: newId(),
//         role: "assistant",
//         content: "Great! Now choose a difficulty level:",
//       },
//     ]);
//     setQuizStage("difficulty");
//     scrollToBottom("auto");
//   };

//   const handleSelectDifficulty = (level: string) => {
//     setQuizLevel(level);
//     setMessages((prev) => [
//       ...prev,
//       { id: newId(), role: "user", content: level },
//       {
//         id: newId(),
//         role: "assistant",
//         content: `Perfect! I'll prepare a ${level} quiz about ${quizTopic}. Ready to start?`,
//       },
//     ]);
//     // After this, show yes/no again
//     setQuizStage("ready");
//     scrollToBottom("auto");
//   };

//   const handleQuizActionFinal = (choice: "yes" | "no") => {
//     if (choice === "no") {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: newId(),
//           role: "assistant",
//           content: "No worries! Let me know whenever you're ready to begin.",
//         },
//       ]);
//       setQuizStage("idle"); // show Start Quiz again
//       scrollToBottom("auto");
//       return;
//     }

//     // choice === "yes": record quiz start and begin
//     reportQuizStart(quizTopic, quizLevel);

//     setMessages((prev) => [
//       ...prev,
//       {
//         id: newId(),
//         role: "assistant",
//         content: `Great! Let's start your ${quizLevel} quiz on ${quizTopic}!`,
//       },
//     ]);
//     setQuizStage("idle"); // reset flow; Start Quiz button available again
//     scrollToBottom("auto");
//   };

//   /** Input handler that respects quiz flow */
//   const handleManualInput = () => {
//     if (quizStage === "topic") {
//       const t = input.trim();
//       if (!t) return;
//       handleSubmitTopic(t);
//       setInput("");
//     } else {
//       onSend(); // any other stage → normal send (which resets flow as needed)
//     }
//   };

//   return (
//     <div className="ai-root">
//       <header className="ai-header">
//         <div>
//           <div className="ai-title">AI Teaching Assistant</div>
//           <div className="ai-sub">Ask, learn, or start a quiz anytime</div>
//         </div>

//         {/* Start Quiz button visible only in idle or confirm */}
//         {(quizStage === "idle" || quizStage === "confirm") && (
//           <button className="btn btn-primary" onClick={handleStartQuiz}>
//             Start Quiz
//           </button>
//         )}
//       </header>

//       <div className="ai-list" ref={listRef}>
//         {messages
//           .filter((m) => m.role !== "system")
//           .map((m) => (
//             <div key={m.id} className={`ai-msg ${m.role}`}>
//               <div className="bubble">{m.content}</div>
//             </div>
//           ))}

//         {/* Yes/No only AFTER clicking Start Quiz */}
//         {quizStage === "confirm" && (
//           <div className="ai-quiz-buttons">
//             <button onClick={() => handleQuizAction("yes")} className="btn btn-primary">
//               Yes
//             </button>
//             <button onClick={() => handleQuizAction("no")} className="btn">
//               No
//             </button>
//           </div>
//         )}

//         {/* Difficulty selection */}
//         {quizStage === "difficulty" && (
//           <div className="ai-quiz-buttons difficulty">
//             {["Easy", "Intermediate", "Hard", "Expert"].map((lvl) => (
//               <button key={lvl} onClick={() => handleSelectDifficulty(lvl)} className="btn btn-diff">
//                 {lvl}
//               </button>
//             ))}
//           </div>
//         )}

//         {/* Yes/No after “Ready to start?” */}
//         {quizStage === "ready" && (
//           <div className="ai-quiz-buttons">
//             <button onClick={() => handleQuizActionFinal("yes")} className="btn btn-primary">
//               Yes
//             </button>
//             <button onClick={() => handleQuizActionFinal("no")} className="btn">
//               No
//             </button>
//           </div>
//         )}

//         {loading && (
//           <div className="ai-msg assistant">
//             <div className="bubble bubble-pending">
//               <span className="dots">
//                 <i></i><i></i><i></i>
//               </span>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Input bar (always visible) */}
//       <form
//         className="ai-composer"
//         onSubmit={(e) => {
//           e.preventDefault();
//           handleManualInput();
//         }}
//       >
//         <input
//           className="ai-input"
//           placeholder={
//             quizStage === "topic"
//               ? "Type a topic for your quiz..."
//               : "Ask or chat with your tutor…"
//           }
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//         />
//         <button className="ai-send" type="submit" disabled={!input.trim() || loading}>
//           Send
//         </button>
//       </form>
//     </div>
//   );
// }
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

// Safe ID generator
function newId() {
  return (globalThis?.crypto?.randomUUID?.() as string) || "id-" + Math.random().toString(36).slice(2);
}

export function AiAgentPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "sys", role: "system", content: SYSTEM_PROMPT },
    { id: "greet", role: "assistant", content: "How can I help you today?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Quiz flow state
  const [quizStage, setQuizStage] = useState<QuizStage>("idle");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizLevel, setQuizLevel] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  /** Always scroll to bottom */
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

  // ----- Regular Q&A (cache-first) -----
  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // If the user types during flow (except topic), reset to idle
    if (quizStage !== "topic") setQuizStage("idle");

    const userMsg: Msg = { id: newId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { cached, answer } = await askQuestion(text);
      const suffix = cached ? " (from cache)" : "";
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: answer + suffix }]);
    } catch (err) {
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
    setQuizStage("confirm");
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
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
        { id: newId(), role: "assistant", content: "No problem! You can start a quiz anytime later." },
      ]);
      setQuizStage("idle");
      scrollToBottom("auto");
      return;
    }
    // yes → ask for topic
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content: "Awesome! What topic would you like the quiz to be about?",
      },
    ]);
    setQuizStage("topic");
    scrollToBottom("auto");
  };

  const handleSubmitTopic = (text: string) => {
    const t = text.trim();
    if (!t) return;

    setQuizTopic(t);
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: t },
      {
        id: newId(),
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
      { id: newId(), role: "user", content: level },
      {
        id: newId(),
        role: "assistant",
        content: `Perfect! I'll prepare a ${level} quiz about ${quizTopic}. Ready to start?`,
      },
    ]);
    setQuizStage("ready");
    scrollToBottom("auto");
  };

  const handleQuizActionFinal = async (choice: "yes" | "no") => {
    if (choice === "no") {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: "No worries! Let me know whenever you're ready to begin.",
        },
      ]);
      setQuizStage("idle");
      scrollToBottom("auto");
      return;
    }

    // choice === "yes": fetch cache-first quiz
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "assistant", content: `Great! Generating your ${quizLevel} quiz on ${quizTopic}...` },
    ]);
    setQuizStage("idle");

    try {
      const { cached, quiz } = await getQuiz(quizTopic, quizLevel);
      const pretty = renderQuizAsText(quiz, cached);
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: pretty }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "Sorry, I couldn't generate the quiz right now." },
      ]);
    } finally {
      scrollToBottom("auto");
    }
  };

  /** Input bar handler that respects quiz flow */
  const handleManualInput = () => {
    if (quizStage === "topic") {
      const t = input.trim();
      if (!t) return;
      handleSubmitTopic(t);
      setInput("");
    } else {
      onSend(); // normal Q&A
    }
  };

  return (
    <div className="ai-root">
      <header className="ai-header">
        <div>
          <div className="ai-title">AI Teaching Assistant</div>
        </div>

        {/* Start Quiz button visible only in idle or confirm */}
        {(quizStage === "idle" || quizStage === "confirm") && (
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
              <div className="bubble" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
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

      {/* Input bar */}
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

/** Render quiz JSON as plain text (quick MVP) */
function renderQuizAsText(quiz: QuizPayload, cached: boolean) {
  const header = `Here is your ${quiz.level} quiz on ${quiz.topic}${cached ? " (from cache)" : ""}:`;
  const lines = quiz.items.map((it, idx) => {
    const q = `${idx + 1}. ${it.question}`;
    if (it.type === "mcq" && it.options) {
      const opts = it.options.map((o, i) => `   ${String.fromCharCode(65 + i)}. ${o}`).join("\n");
      return `${q}\n${opts}`;
    }
    return q;
  });
  return [header, ...lines, "Reply with your answers and I’ll check them!"].join("\n");
}
