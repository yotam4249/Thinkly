/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { askQuestion, getQuiz, type QuizPayload } from "../../services/ai.services";
import "../../styles/ai.css";

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };
type QuizStage = "idle" | "confirm" | "topic" | "difficulty" | "ready";

function newId() {
  return crypto.randomUUID();
}

export function AiAgentPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "sys", role: "system", content: "You are a friendly AI tutor." },
    { id: "greet", role: "assistant", content: "How can I help you today?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Quiz state
  const [quizStage, setQuizStage] = useState<QuizStage>("idle");
  const [quizMode, setQuizMode] = useState(false);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizLevel, setQuizLevel] = useState("");
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll for normal chat
  useEffect(() => {
    if (!quizMode) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, quizMode]);

  // ----- Regular Q&A -----
  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (quizMode) return; // disable during quiz
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { id: newId(), role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const { cached, answer } = await askQuestion(text);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: answer + (cached ? " (from cache)" : "") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: "Sorry, I couldn't reach the AI right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ----- QUIZ FLOW -----
  const handleStartQuiz = () => {
    setQuizStage("confirm");
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "assistant", content: "Would you like to take a short quiz?" },
    ]);
  };

  const handleQuizAction = (choice: "yes" | "no") => {
    if (choice === "no") {
      setMessages((p) => [...p, { id: newId(), role: "assistant", content: "No problem!" }]);
      setQuizStage("idle");
      return;
    }
    setMessages((p) => [...p, { id: newId(), role: "assistant", content: "What topic?" }]);
    setQuizStage("topic");
  };

  const handleSubmitTopic = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setQuizTopic(t);
    setMessages((p) => [
      ...p,
      { id: newId(), role: "user", content: t },
      { id: newId(), role: "assistant", content: "Choose difficulty level:" },
    ]);
    setQuizStage("difficulty");
  };

  const handleSelectDifficulty = (level: string) => {
    setQuizLevel(level);
    setMessages((p) => [
      ...p,
      { id: newId(), role: "user", content: level },
      { id: newId(), role: "assistant", content: `Preparing a ${level} quiz about ${quizTopic}. Ready?` },
    ]);
    setQuizStage("ready");
  };

  const handleQuizActionFinal = async (choice: "yes" | "no") => {
    if (choice === "no") {
      setMessages((p) => [
        ...p,
        { id: newId(), role: "assistant", content: "Sure, maybe later!" },
      ]);
      setQuizStage("idle");
      return;
    }
    setQuizStage("idle");
    setMessages((p) => [
      ...p,
      { id: newId(), role: "assistant", content: "Generating your quiz..." },
    ]);
    const { quiz } = await getQuiz(quizTopic, quizLevel);
    setQuiz(quiz);
    setAnswers(Array(quiz.items.length).fill(-1));
    setQuizMode(true);
    setCurrentIdx(0);
  };

  const handleManualInput = () => {
    if (quizStage === "topic") {
      handleSubmitTopic(input);
      setInput("");
    } else {
      onSend();
    }
  };

  // ----- QUIZ MODE -----
  const handleSelectAnswer = (optionIndex: number) => {
    if (!quiz) return;
    const newAnswers = [...answers];
    newAnswers[currentIdx] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentIdx < quiz.items.length - 1) setCurrentIdx(currentIdx + 1);
    else finishQuiz();
  };

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const finishQuiz = () => {
    if (!quiz) return;
    let correct = 0;
    quiz.items.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    setScore(correct);
    setQuizMode(false);
    setMessages((p) => [
      ...p,
      { id: newId(), role: "assistant", content: `✅ You scored ${correct}/${quiz.items.length}! Great job!` },
    ]);
    setQuiz(null);
  };

  const handleQuitQuiz = () => {
    setQuizMode(false);
    setQuiz(null);
    setMessages((p) => [
      ...p,
      { id: newId(), role: "assistant", content: "Quiz exited. You can start a new one anytime!" },
    ]);
  };

  // ----- RENDER -----
  return (
    <div className="ai-root">
      {!quizMode && (
        <>
          <header className="ai-header">
            <div>
              <div className="ai-title">AI Teaching Assistant</div>
              <div className="ai-sub">Ask questions or start a quiz</div>
            </div>
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
                  <div className="bubble">{m.content}</div>
                </div>
              ))}

            {/* yes/no & difficulty */}
            {quizStage === "confirm" && (
              <div className="ai-quiz-buttons">
                <button className="btn btn-primary" onClick={() => handleQuizAction("yes")}>
                  Yes
                </button>
                <button className="btn" onClick={() => handleQuizAction("no")}>
                  No
                </button>
              </div>
            )}

            {quizStage === "difficulty" && (
              <div className="ai-quiz-buttons difficulty">
                {["Easy", "Intermediate", "Hard"].map((lvl) => (
                  <button key={lvl} className="btn btn-diff" onClick={() => handleSelectDifficulty(lvl)}>
                    {lvl}
                  </button>
                ))}
              </div>
            )}

            {quizStage === "ready" && (
              <div className="ai-quiz-buttons">
                <button className="btn btn-primary" onClick={() => handleQuizActionFinal("yes")}>
                  Yes
                </button>
                <button className="btn" onClick={() => handleQuizActionFinal("no")}>
                  No
                </button>
              </div>
            )}
          </div>

          <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); handleManualInput(); }}>
            <input
              className="ai-input"
              placeholder="Ask or chat with your tutor…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="ai-send" type="submit" disabled={!input.trim() || loading}>
              Send
            </button>
          </form>
        </>
      )}

      {quizMode && quiz && (
        <div className="quiz-fullscreen">
          <QuizView
            quiz={quiz}
            currentIdx={currentIdx}
            answers={answers}
            onSelect={handleSelectAnswer}
            onNext={handleNext}
            onBack={handleBack}
          />
          <button className="btn btn-quit" onClick={handleQuitQuiz}>
            Quit Quiz
          </button>
        </div>
      )}
    </div>
  );
}

/** Subcomponent for rendering the quiz question view */
function QuizView({
  quiz,
  currentIdx,
  answers,
  onSelect,
  onNext,
  onBack,
}: {
  quiz: QuizPayload;
  currentIdx: number;
  answers: number[];
  onSelect: (i: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const q = quiz.items[currentIdx];
  const userAnswer = answers[currentIdx];

  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <div className="quiz-title">
          {quiz.topic} — {quiz.level}
        </div>
        <div>Question {currentIdx + 1} / {quiz.items.length}</div>
      </div>

      <div className="quiz-question">{q.question}</div>
      <div className="quiz-options">
        {q.options.map((opt, i) => (
          <button
            key={i}
            className={`quiz-option ${userAnswer === i ? "selected" : ""}`}
            onClick={() => onSelect(i)}
          >
            {String.fromCharCode(65 + i)}. {opt}
          </button>
        ))}
      </div>

      <div className="quiz-nav">
        <button className="btn" disabled={currentIdx === 0} onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          {currentIdx < quiz.items.length - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
}
