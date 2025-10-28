import { useNavigate } from "react-router-dom";
import "../../styles/chat.css";

export function ChatHeader({ chatId, title = "Chat" }: { chatId: string; title?: string }) {
  const navigate = useNavigate();
  return (
    <header className="chat-header">
      <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div>
        <h3 className="title">{title}</h3>
        <div className="sub">#{chatId.slice(-6)}</div>
      </div>
    </header>
  );
}
