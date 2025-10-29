/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listChats,
  joinGroup,
  createGroupChat,
  createDmChatByUsername,
} from "../services/chat.service";
import AuthService from "../services/auth.service";

import type { ChatListItem } from "../types/chatList.type";

import { Header } from "../components/home/Header";
import { EmptyState } from "../components/home/EmptyState";
import { NewChatModal } from "../components/home/NewChatModal";
import { ErrorToast } from "../components/common/ErrorToast";
import { LogoutButton } from "../components/common/LogoutButton";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

import { ChatFilterTabs, type ChatFilter } from "../components/home/ChatFilterTabs";
import { ChatListPanel } from "../components/home/ChatListPanel";

import "../styles/home.css";

function fmt(iso?: string) {
  return iso ? new Date(iso).toLocaleString() : "";
}

export default function Home() {
  const navigate = useNavigate();

  // data
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // errors
  const [err, setErr] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  // filter
  const [filter, setFilter] = useState<ChatFilter>("groups");

  // create modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"dm" | "group">("group");
  // For DM: this is a username (single). For group: IDs (or whatever you use).
  const [newMembers, setNewMembers] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  // joining state
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // load page
  const load = async (p: number) => {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await listChats(p, 15);
      setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (e: any) {
      setErr(e?.response?.data?.code ?? "FAILED_TO_LOAD_CHATS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // infinite scroll (we keep it in Home so pagination stays centralized)
  const onHitBottom = () => {
    if (!loading && hasMore) load(page + 1);
  };
  const sentinelRef = useInfiniteScroll(onHitBottom, [page, hasMore, loading]);

  // derived lists (never show DMs that aren't mine)
  const groupMember = items.filter((x) => x.type === "group" && x.isMember);
  const dms = items.filter((x) => x.type === "dm" && x.isMember !== false);
  const otherGroups = items.filter((x) => x.type === "group" && !x.isMember);

  const filteredItems =
    filter === "groups" ? groupMember : filter === "dms" ? dms : otherGroups;

  // actions
  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch {
      // ignore network errors; tokens are cleared anyway
    } finally {
      navigate("/login");
    }
  };

  const handleCreate = async () => {
    // tokens: for DM -> username; for group -> IDs (or your semantics)
    const tokens = newMembers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (newType === "group") {
      if (!newTitle.trim()) {
        setCreateErr("TITLE_REQUIRED");
        return;
      }
    } else {
      // dm: strictly one username
      if (tokens.length !== 1) {
        setCreateErr("DM_MUST_HAVE_EXACTLY_ONE_USERNAME");
        return;
      }
    }

    setCreating(true);
    setCreateErr(null);
    try {
      if (newType === "group") {
        const title = newTitle.trim();
        const created = await createGroupChat(title, tokens);
        const chatId = (created as any).id ?? (created as any).chatId;
        const reused = Boolean((created as any).reused);

        const computedTitle = title || "(untitled)";
        if (!reused) {
          setItems((prev) => [
            {
              id: chatId,
              type: "group",
              title: computedTitle,
              lastMessageText: "",
              lastMessageAt: new Date().toISOString(),
              isMember: true,
            },
            ...prev,
          ]);
        }
        setNewTitle("");
        setNewMembers("");
        setNewType("group");
        setShowNewChat(false);
        setFilter("groups");
        navigate(`/chat/${chatId}`, { state: { title: computedTitle } });
      } else {
        // dm by username
        const username = tokens[0];
        const created = await createDmChatByUsername(username);
        const chatId = (created as any).id ?? (created as any).chatId;
        const reused = Boolean((created as any).reused);

        const computedTitle = "(DM)";
        if (!reused) {
          setItems((prev) => [
            {
              id: chatId,
              type: "dm",
              title: computedTitle,
              lastMessageText: "",
              lastMessageAt: new Date().toISOString(),
              isMember: true,
            },
            ...prev,
          ]);
        }
        setNewTitle("");
        setNewMembers("");
        setNewType("group");
        setShowNewChat(false);
        setFilter("dms");
        navigate(`/chat/${chatId}`, { state: { title: computedTitle } });
      }
    } catch (e: any) {
      setCreateErr(e?.response?.data?.code ?? "FAILED_TO_CREATE_CHAT");
    } finally {
      setCreating(false);
    }
  };

  const openChat = (id: string, title?: string) => {
    navigate(`/chat/${id}`, { state: { title: title || "(untitled)" } });
  };

  const handleJoin = async (chatId: string) => {
    setJoinErr(null);
    setJoiningId(chatId);
    try {
      await joinGroup(chatId);
      setItems((prev) =>
        prev.map((it) => (it.id === chatId ? { ...it, isMember: true } : it))
      );
      const title = items.find((x) => x.id === chatId)?.title || "(untitled)";
      setFilter("groups"); // it moves from Other -> Groups
      openChat(chatId, title);
    } catch (e: any) {
      setJoinErr(e?.response?.data?.code ?? "FAILED_TO_JOIN_GROUP");
    } finally {
      setJoiningId(null);
    }
  };

  const counts = {
    groups: groupMember.length,
    dms: dms.length,
    other: otherGroups.length,
  };

  const count = filteredItems.length;
  const hasAnyItems = items.length > 0;
  const hasFilteredItems = count > 0;

  return (
    <div className="shell">
      <LogoutButton onClick={handleLogout} />

      <div className="gradient-bg" />

      <div className="card">
        <Header count={count} onNewChat={() => setShowNewChat(true)} />

        {err && <ErrorToast message={err} />}
        {joinErr && <ErrorToast message={joinErr} />}

        <ChatFilterTabs value={filter} onChange={setFilter} counts={counts} />

        {!loading && !hasFilteredItems && !err && !hasAnyItems && (
          <EmptyState onCreateClick={() => setShowNewChat(true)} />
        )}

        <ChatListPanel
          items={filteredItems}
          loading={loading}
          hasMore={hasMore}
          joiningId={joiningId}
          fmtTime={fmt}
          onOpen={(id) => {
            const t = filteredItems.find((x) => x.id === id)?.title;
            openChat(id, t);
          }}
          onJoin={handleJoin}
          onLoadMore={() => load(page + 1)}
          sentinelRef={sentinelRef}
        />
      </div>

      <NewChatModal
        open={showNewChat}
        creating={creating}
        createErr={createErr}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newType={newType}
        setNewType={setNewType}
        newMembers={newMembers}
        setNewMembers={setNewMembers}
        onClose={() => setShowNewChat(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
