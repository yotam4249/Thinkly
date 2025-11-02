import { useState } from "react";
import type { ChatMessage } from "../../types/chat.type";
import { isQuizPreviewMessage, parseQuizPreviewMessage } from "../../utils/quiz.utils";
import { InteractiveQuiz } from "../ai/InteractiveQuiz";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

// We allow an extra UI-only field `senderName` that ChatPage injects.
type MsgWithName = ChatMessage & { senderName?: string };

export function MessageRow({ 
  msg, 
  meId, 
  onSend 
}: { 
  msg: ChatMessage; 
  meId: string;
  onSend?: (text: string) => void;
}) {
  const m = msg as MsgWithName;
  const mine = m.senderId === meId;
  const [quizExpanded, setQuizExpanded] = useState(false);

  // Prefer username if provided; otherwise fall back to short id.
  // For own messages, show your username if present; else "You".
  const displayName = mine
    ? m.senderName ?? "You"
    : m.senderName ?? m.senderId.slice(-4);

  const timeStr = fmtTime(m.createdAt);
  const isPending = m.pending;

  // Check if this is a quiz preview message
  const isQuizPreview = isQuizPreviewMessage(m.text);
  const quizData = isQuizPreview ? parseQuizPreviewMessage(m.text) : null;

  const handleQuizYes = () => {
    if (!quizData) return;
    // Show interactive quiz
    setQuizExpanded(true);
  };

  const handleQuizNo = () => {
    // Do nothing as per requirements
  };

  return (
    <article 
      className={`row ${mine ? "me" : "other"}`}
      role="article"
      aria-label={`Message from ${displayName}${timeStr ? ` at ${timeStr}` : ""}`}
    >
      <div 
        className={`bubble ${mine ? "bubble-me" : "bubble-other"}`}
        aria-label={isPending ? "Sending message" : undefined}
      >
        {isQuizPreview && quizData && !quizExpanded ? (
          <div className="quiz-preview">
            <div className="quiz-preview-text">
              <strong>{quizData.sharedBy}</strong> shared a quiz at topic <strong>"{quizData.topic}"</strong>. Would you like to take it?
            </div>
            <div className="quiz-preview-actions">
              <button
                className="btn btn-primary btn-small"
                onClick={handleQuizYes}
                type="button"
                aria-label="Yes, show the quiz"
              >
                Yes
              </button>
              <button
                className="btn btn-small"
                onClick={handleQuizNo}
                type="button"
                aria-label="No, don't show the quiz"
              >
                No
              </button>
            </div>
          </div>
        ) : isQuizPreview && quizExpanded && quizData ? (
          <div className="quiz-interactive-wrapper">
            <InteractiveQuiz quiz={quizData.quiz} />
          </div>
        ) : (
          <div className="bubble-content">{m.text}</div>
        )}
      </div>
      <footer className="meta" aria-label="Message metadata">
        <span className="meta-name" aria-label={`Sender: ${displayName}`}>
          {displayName}
        </span>
        {timeStr && (
          <time className="meta-time" dateTime={m.createdAt} aria-label={`Sent at ${timeStr}`}>
            {timeStr}
          </time>
        )}
        {isPending && (
          <span className="meta-pending" aria-label="Message is being sent">
            • sending…
          </span>
        )}
      </footer>
    </article>
  );
}
