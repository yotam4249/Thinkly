/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listChats, createChat, joinGroup } from "../services/chat.service";
import AuthService from "../services/auth.service";

import type { ChatListItem } from "../types/chatList.type";

import { Header } from "../components/home/Header";
import { EmptyState } from "../components/home/EmptyState";
import { ChatList } from "../components/home/ChatList";
import { NewChatModal } from "../components/home/NewChatModal";
import { SkeletonList } from "../components/home/SkeletonList";
import { ErrorToast } from "../components/common/ErrorToast";
import { LogoutButton } from "../components/common/LogoutButton";
import { LoadMore } from "../components/common/LoadMore";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

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

  // create modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"dm" | "group">("group");
  const [newMembers, setNewMembers] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  // joining state
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const isJoining = (id: string) => joiningId === id;

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

  // infinite scroll
  const onHitBottom = () => {
    if (!loading && hasMore) load(page + 1);
  };
  const sentinelRef = useInfiniteScroll(onHitBottom, [page, hasMore, loading]);

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
    if (newType === "group" && !newTitle.trim()) {
      setCreateErr("TITLE_REQUIRED");
      return;
    }

    const members = newMembers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (newType === "dm" && members.length !== 1) {
      setCreateErr("DM_MUST_HAVE_EXACTLY_ONE_OTHER_MEMBER");
      return;
    }

    setCreating(true);
    setCreateErr(null);
    try {
      const payloadMembers = members.length ? members : undefined;

      const { chatId, reused } = await createChat(
        newType,
        newType === "group" ? newTitle.trim() : undefined,
        payloadMembers
      );

      const computedTitle =
        newType === "group" ? (newTitle.trim() || "(untitled)") : "(DM)";

      if (!reused) {
        setItems((prev) => [
          {
            id: chatId,
            type: newType,
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

      navigate(`/chat/${chatId}`, { state: { title: computedTitle } });
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
      openChat(chatId, title);
    } catch (e: any) {
      setJoinErr(e?.response?.data?.code ?? "FAILED_TO_JOIN_GROUP");
    } finally {
      setJoiningId(null);
    }
  };

  const count = items.length;
  const hasItems = count > 0;

  return (
    <div className="shell">
      <LogoutButton onClick={handleLogout} />

      <div className="gradient-bg" />

      <div className="card">
        <Header count={count} onNewChat={() => setShowNewChat(true)} />

        {err && <ErrorToast message={err} />}
        {joinErr && <ErrorToast message={joinErr} />}

        <div className="card-body">
          {!loading && !hasItems && !err && (
            <EmptyState onCreateClick={() => setShowNewChat(true)} />
          )}

          {loading && !hasItems ? (
            <SkeletonList rows={6} />
          ) : (
            <ChatList
              items={items}
              onOpen={(id) => {
                const t = items.find((x) => x.id === id)?.title;
                openChat(id, t);
              }}
              onJoin={handleJoin}
              joiningId={joiningId}
              fmtTime={fmt}
            />
          )}

          {hasMore && (
            <LoadMore onClick={() => load(page + 1)} loading={loading} />
          )}

          <div ref={sentinelRef} className="sentinel" />
        </div>
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
