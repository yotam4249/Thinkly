// import avatarIcon from "../../assets/avatar.svg";
// import groupIcon from "../../assets/group.svg";
// import type { ChatListItem } from "../../types/chatList.type";
// import { fmtTime } from "./utils";

// type Props = {
//   item: ChatListItem;
//   onOpen: (id: string) => void;
// };

// export function ChatItem({ item, onOpen }: Props) {
//   const isGroup = item.type === "group";
//   const badgeIcon = isGroup ? groupIcon : avatarIcon;
//   const badgeLabel = isGroup ? "Group" : "DM";

//   return (
//     <li
//       className="chat-item"
//       onClick={() => onOpen(item.id)}
//       tabIndex={0}
//       onKeyDown={(e) => {
//         if (e.key === "Enter" || e.key === " ") onOpen(item.id);
//       }}
//     >
//       {/* Avatar */}
//       <img
//         src={avatarIcon}
//         alt="avatar"
//         className="avatar-img"
//         width={44}
//         height={44}
//       />

//       {/* Chat info */}
//       <div className="chat-info">
//         <div className="chat-title-row">
//           <div className="chat-title">{item.title || "(untitled)"}</div>

//           {/* Type badge */}
//           <span className={`badge ${isGroup ? "group" : "dm"}`}>
//             <img
//               src={badgeIcon}
//               alt={badgeLabel}
//               width={14}
//               height={14}
//               className="badge-icon"
//             />
//             <span className="badge-label">{badgeLabel}</span>
//           </span>
//         </div>

//         <div className="chat-preview">
//           {item.lastMessageText || "No messages yet"}
//         </div>
//       </div>

//       {/* Time */}
//       <div className="chat-time">{fmtTime(item.lastMessageAt)}</div>
//     </li>
//   );
// }
import { type ReactNode } from "react";
import avatarIcon from "../../assets/avatar.svg";
import groupIcon from "../../assets/group.svg";
import type { ChatListItem } from "../../types/chatList.type";

type Props = {
  item: ChatListItem;
  onOpen: (id: string) => void;
  rightSlot?: ReactNode;
};

export function ChatItem({ item, onOpen, rightSlot }: Props) {
  const isGroup = item.type === "group";
  const badgeIcon = isGroup ? groupIcon : avatarIcon;
  const badgeLabel = isGroup ? "Group" : "DM";

  return (
    <li
      className="list-item chat-item one-line"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button")) return;
        onOpen(item.id);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(item.id);
      }}
    >
      {/* Left: avatar */}
      <img src={avatarIcon} alt="avatar" className="avatar-img" width={34} height={34} />

      {/* Middle: single inline row */}
      <div className="chat-info chat-inline" title={item.lastMessageText || ""}>
        {/* Title + badge on same row */}
        <span className="chat-title ellipsis">{item.title || "(untitled)"}</span>

        <span className={`badge inline ${isGroup ? "group" : "dm"}`}>
          <img src={badgeIcon} alt={badgeLabel} width={14} height={14} className="badge-icon" />
          <span className="badge-label">{badgeLabel}</span>
        </span>

        {/* dot + last message on same row */}
        <span className="dot-sep" aria-hidden>•</span>

        <span className="chat-preview ellipsis">
          {item.lastMessageText || "No messages yet"}
        </span>
      </div>

      {/* Right side: time + button */}
      {rightSlot}
    </li>
  );
}
