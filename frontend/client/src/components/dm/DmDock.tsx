/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/dm/DmDock.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatListItem } from "../../types/chatList.type";
import { useDmWindows } from "./DmWindowsProvider";
import { getChatMeta } from "../../services/chat.service";
import { TokenManager } from "../../services/api";
import { getSocket } from "../../services/socket.service";
import "../../styles/dm.css";

type Props = {
  dms: ChatListItem[];
  loading?: boolean;
  className?: string;
};

// Decode user id from the current access token (matches your chatpage helper)
function decodeUserIdFromJWT(jwt?: string | null): string | null {
  try {
    if (!jwt) return null;
    const [, payload] = jwt.split(".");
    const json = JSON.parse(atob(payload));
    return json._id || json.userId || json.sub || null;
  } catch {
    return null;
  }
}

export function DmDock({ dms, loading, className }: Props) {
  const { openWindow } = useDmWindows();

  const [open, setOpen] = useState(false); // default closed
  const [q, setQ] = useState("");

  // cache of dmId -> display name (peer username)
  const [peerNameByChat, setPeerNameByChat] = useState<Record<string, string>>({});
  const fetching = useRef<Set<string>>(new Set());

  // overlay state managed by socket events:
  // - last message preview by chat
  // - unseen badge by chat
  const [lastByChat, setLastByChat] = useState<Record<string, { text: string; at?: string }>>({});
  const [unseenByChat, setUnseenByChat] = useState<Record<string, number>>({});

  // track which rooms we joined so we can diff-join/leave
  const joinedRooms = useRef<Set<string>>(new Set());

  const currentUserId = useMemo(() => decodeUserIdFromJWT(TokenManager.access ?? null), []);

  // Shift Logout button and page padding when dock opens
  useEffect(() => {
    const root = document.documentElement;
    const offsetWhenOpen = 280 + 24; // 304px
    const offsetWhenClosed = 48;

    const offset = open ? `${offsetWhenOpen}px` : `${offsetWhenClosed}px`;
    root.style.setProperty("--dm-dock-offset", offset);
    root.style.setProperty("--dm-dock-padding", offset);

    return () => {
      root.style.setProperty("--dm-dock-offset", `${offsetWhenClosed}px`);
      root.style.setProperty("--dm-dock-padding", "0px");
    };
  }, [open]);

  // Resolve a human name for each DM (other participant)
  useEffect(() => {
    if (!currentUserId) return;

    const toFetch = dms
      .filter((x) => x.type === "dm")
      .map((x) => x.id)
      .filter((id) => !peerNameByChat[id] && !fetching.current.has(id));

    if (toFetch.length === 0) return;

    const batch = toFetch.slice(0, 6);
    batch.forEach(async (chatId) => {
      try {
        fetching.current.add(chatId);
        const meta = await getChatMeta(chatId);
        const peer =
          meta.members?.find?.((m) => m._id !== currentUserId) ??
          meta.members?.[0] ??
          null;

        const label =
          peer?.username ||
          peer?.fullName ||
          peer?.name ||
          peer?.email ||
          "(DM)";

        setPeerNameByChat((prev) => ({ ...prev, [chatId]: label }));
      } catch {
        setPeerNameByChat((prev) => ({ ...prev, [chatId]: "(DM)" }));
      } finally {
        fetching.current.delete(chatId);
      }
    });
  }, [dms, currentUserId, peerNameByChat]);

  // ✅ JOIN all DM rooms so the dock receives `message:new` in realtime
  useEffect(() => {
    const s = getSocket();
    const dmIds = dms.filter((x) => x.type === "dm").map((x) => x.id);
    const nextSet = new Set(dmIds);

    // join newly added rooms
    for (const id of dmIds) {
      if (!joinedRooms.current.has(id)) {
        s.emit?.("chat:join", { chatId: id });
        joinedRooms.current.add(id);
      }
    }

    // leave rooms that are no longer in the list
    for (const id of Array.from(joinedRooms.current)) {
      if (!nextSet.has(id)) {
        s.emit?.("chat:leave", { chatId: id });
        joinedRooms.current.delete(id);
      }
    }

    // listener for new messages (groups + dms); we'll filter by DM ids
    const onMessageNew = (payload: any) => {
      const chatId = String(payload?.chatId ?? "");
      if (!nextSet.has(chatId)) return;        // only care about our DM rooms
      const text = String(payload?.text ?? payload?.content ?? "");
      const from = String(payload?.senderId ?? "");

      // Update last message preview
      setLastByChat((prev) => ({
        ...prev,
        [chatId]: { text, at: payload?.createdAt },
      }));

      // Mark unseen ONLY if it's from someone else
      setUnseenByChat((prev) => {
        if (from && currentUserId && from === currentUserId) {
          // our own send → do not increment unseen; also clear if existed
          if (!prev[chatId]) return prev;
          const { [chatId]: _, ...rest } = prev;
          return rest;
        }
        const next = (prev[chatId] ?? 0) + 1;
        return { ...prev, [chatId]: next };
      });
    };

    s.on?.("message:new", onMessageNew);

    return () => {
      s.off?.("message:new", onMessageNew);
      // do NOT mass-leave here; we maintain joins across the dock lifetime
    };
  }, [dms, currentUserId]);

  // Compute display list with resolved names + overlay last message/unseen
  const withDisplayNames = useMemo(() => {
    return dms.map((it) => {
      if (it.type !== "dm") return it;
      const resolved = peerNameByChat[it.id];
      // overlay latest text if socket says we have a fresher one
      const overlay = lastByChat[it.id]?.text;
      return {
        ...it,
        title: resolved || it.title || "(DM)",
        lastMessageText: overlay ?? it.lastMessageText ?? "",
      };
    });
  }, [dms, peerNameByChat, lastByChat]);

  const filtered = useMemo(() => {
    if (!q.trim()) return withDisplayNames;
    const s = q.trim().toLowerCase();
    return withDisplayNames.filter((x) => (x.title || "").toLowerCase().includes(s));
  }, [withDisplayNames, q]);

  // When opening a DM window from the dock, clear its unseen counter
  const handleOpen = (chatId: string, title?: string) => {
    // Clear unseen badge immediately
    setUnseenByChat((prev) => {
      if (!prev[chatId]) return prev;
      const { [chatId]: _, ...rest } = prev;
      return rest;
    });

    openWindow({ chatId, title: title || "(DM)" });
  };

  return (
    <aside className={`dm-dock ${open ? "open" : "closed"} ${className ?? ""}`}>
      <button className="dm-dock-toggle" onClick={() => setOpen((v) => !v)} aria-label="Toggle DM dock">
        {open ? "‹" : "›"}
      </button>

      {open && (
        <>
          <div className="dm-dock-header">
            <h3>Direct Messages</h3>
            <input
              className="dm-search"
              placeholder="Search DM…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="dm-list">
            {loading && dms.length === 0 && <div className="dm-empty">Loading…</div>}
            {!loading && filtered.length === 0 && <div className="dm-empty">No DMs</div>}

            {filtered.map((it) => {
              const unseen = unseenByChat[it.id] ?? 0;
              const preview = (it.lastMessageText || "").slice(0, 36);
              const hasMore = (it.lastMessageText || "").length > 36;

              return (
                <button
                  key={it.id}
                  className={`dm-item ${unseen ? "has-unseen" : ""}`}
                  onClick={() => handleOpen(it.id, it.title)}
                  title={it.title || "(DM)"}
                >
                  <div className="dm-avatar" aria-hidden />
                  <div className="dm-meta">
                    <div className="dm-title-row">
                      <div className="dm-title">{it.title || "(DM)"}</div>
                      {unseen > 0 && (
                        <span className="dm-unseen-dot" aria-label={`${unseen} new`}>
                          {unseen > 9 ? "9+" : unseen}
                        </span>
                      )}
                    </div>
                    {it.lastMessageText && (
                      <div className="dm-sub">
                        {preview}
                        {hasMore ? "…" : ""}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
