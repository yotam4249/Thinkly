// src/pages/home.tsx
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

// ✅ NEW: import the AI panel (no other component changes)
import { AiAgentPanel } from "../components/ai/AiAgentPanel";

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

  // infinite scroll
  const onHitBottom = () => {
    if (!loading && hasMore) load(page + 1);
  };
  const sentinelRef = useInfiniteScroll(onHitBottom, [page, hasMore, loading]);

  // derived lists
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
      // ignore
    } finally {
      navigate("/login");
    }
  };

  const handleCreate = async () => {
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
      setFilter("groups");
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

      {/* ⬇️ NEW: non-invasive wrapper to show AI on the right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        {/* ORIGINAL CARD — untouched */}
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

        {/* ✅ NEW: AI panel on the right (no props needed) */}
        <aside
          style={{
            height: "100%",
            position: "sticky",
            top: 0,
            borderRadius: 18,
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <AiAgentPanel />
        </aside>
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
