import { useRef } from "react";
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

  const autogrow = () => {
    const ta = areaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(160, ta.scrollHeight) + "px";
  };

  const send = () => {
    const text = areaRef.current?.value?.trim();
    if (!text) return;
    onSend(text);
    if (areaRef.current) {
      areaRef.current.value = "";
      autogrow();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="composer">
      <div className="input-wrap">
        <textarea
          ref={areaRef}
          className="textarea"
          placeholder={placeholder}
          onInput={autogrow}
          onKeyDown={onKeyDown}
          rows={1}
          dir="auto"
        />
      </div>

      <button className="send-btn" onClick={send} disabled={disabled}>
        <img
          src={sendIcon}
          alt="Send"
          style={{
            width: 20,
            height: 20,
            marginRight: 6,
            filter: disabled ? "grayscale(0.6)" : "none",
          }}
        />
        Send
      </button>
    </div>
  );
}
