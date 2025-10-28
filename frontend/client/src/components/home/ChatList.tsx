import type { ChatListItem } from "../../types/chatList.type";
import { ChatItem } from "./ChatItem";

type Props = {
  items: ChatListItem[];
  onOpen: (id: string) => void;
};

export function ChatList({ items, onOpen }: Props) {
  return (
    <ul className="chat-list">
      {items.map((c) => (
        <ChatItem key={c.id} item={c} onOpen={onOpen} />
      ))}
    </ul>
  );
}
