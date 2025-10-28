import avatarIcon from "../../assets/avatar.svg";
import groupIcon from "../../assets/group.svg";
import type { ChatListItem } from "../../types/chatList.type";
import { fmtTime } from "./utils";

type Props = {
  item: ChatListItem;
  onOpen: (id: string) => void;
};

export function ChatItem({ item, onOpen }: Props) {
  const isGroup = item.type === "group";
  const badgeIcon = isGroup ? groupIcon : avatarIcon;
  const badgeLabel = isGroup ? "Group" : "DM";

  return (
    <li
      className="chat-item"
      onClick={() => onOpen(item.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(item.id);
      }}
    >
      {/* Avatar */}
      <img
        src={avatarIcon}
        alt="avatar"
        className="avatar-img"
        width={44}
        height={44}
      />

      {/* Chat info */}
      <div className="chat-info">
        <div className="chat-title-row">
          <div className="chat-title">{item.title || "(untitled)"}</div>

          {/* Type badge */}
          <span className={`badge ${isGroup ? "group" : "dm"}`}>
            <img
              src={badgeIcon}
              alt={badgeLabel}
              width={14}
              height={14}
              className="badge-icon"
            />
            <span className="badge-label">{badgeLabel}</span>
          </span>
        </div>

        <div className="chat-preview">
          {item.lastMessageText || "No messages yet"}
        </div>
      </div>

      {/* Time */}
      <div className="chat-time">{fmtTime(item.lastMessageAt)}</div>
    </li>
  );
}
