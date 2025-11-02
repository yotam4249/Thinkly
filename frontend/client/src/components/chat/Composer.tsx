import { useRef, useState } from "react";
import sendIcon from "../../assets/sendButton.svg";

export function Composer({
  disabled,
  onSend,
  placeholder = "Type your message...",
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  const autogrow = () => {
    const ta = areaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(160, ta.scrollHeight) + "px";
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    autogrow();
  };

  const send = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    const ta = areaRef.current;
    if (ta) {
      // reset height & keep focus for quick follow-ups
      ta.style.height = "auto";
      ta.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Enable only when there's non-whitespace text and not externally disabled
  const canSend = !disabled && value.trim().length > 0;
  const charCount = value.length;
  const charLimit = 5000; // Reasonable message limit

  return (
    <div className="composer" role="region" aria-label="Message composer">
      <div className="input-wrap">
        <label htmlFor="message-input" className="sr-only">
          Type your message
        </label>
        <textarea
          id="message-input"
          ref={areaRef}
          className="textarea"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          rows={1}
          dir="auto"
          aria-label="Message input"
          aria-describedby="message-hint"
          maxLength={charLimit}
          disabled={disabled}
        />
        {charCount > charLimit * 0.8 && (
          <span 
            id="message-hint" 
            className="char-count"
            aria-live="polite"
          >
            {charCount} / {charLimit}
          </span>
        )}
      </div>

      <button
        className="send-btn"
        onClick={send}
        disabled={!canSend}
        aria-disabled={!canSend}
        aria-label={canSend ? "Send message" : "Type a message to enable sending"}
        title={canSend ? "Send message (Enter)" : "Type a message to enable"}
        type="button"
      >
        <img
          src={sendIcon}
          alt=""
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            marginRight: 6,
            filter: !canSend ? "grayscale(0.6) opacity(0.5)" : "none",
            transition: "filter 0.2s ease",
          }}
        />
        <span>Send</span>
      </button>
    </div>
  );
}
