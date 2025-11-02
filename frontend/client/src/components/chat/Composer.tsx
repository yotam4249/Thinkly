import { useRef, useState } from "react";
import sendIcon from "../../assets/sendButton.svg";

export function Composer({
  disabled,
  onSend,
  placeholder = "Send message...",
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

  // Enable only when there’s non-whitespace text and not externally disabled
  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="composer">
      <div className="input-wrap">
        <textarea
          ref={areaRef}
          className="textarea"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          rows={1}
          dir="auto"
        />
      </div>

      <button
        className="send-btn"
        onClick={send}
        disabled={!canSend}
        aria-disabled={!canSend}
        title={canSend ? "Send message" : "Type a message to enable"}
      >
        <img
          src={sendIcon}
          alt="Send"
          style={{
            width: 20,
            height: 20,
            marginRight: 6,
            filter: !canSend ? "grayscale(0.6)" : "none",
          }}
        />
        Send
      </button>
    </div>
  );
}
