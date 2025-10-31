// src/components/dm/DmDock.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatListItem } from "../../types/chatList.type";
import { useDmWindows } from "./DmWindowsProvider";
import { getChatMeta } from "../../services/chat.service";
import { TokenManager } from "../../services/api";
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

    // Fetch a few at a time to avoid bursts
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
        // fallback stays as default "(DM)"
        setPeerNameByChat((prev) => ({ ...prev, [chatId]: "(DM)" }));
      } finally {
        fetching.current.delete(chatId);
      }
    });
  }, [dms, currentUserId, peerNameByChat]);

  // Compute display list with resolved names
  const withDisplayNames = useMemo(() => {
    return dms.map((it) => {
      if (it.type !== "dm") return it;
      const resolved = peerNameByChat[it.id];
      return {
        ...it,
        // prefer resolved peer name; else use provided title; else "(DM)"
        title: resolved || it.title || "(DM)",
      };
    });
  }, [dms, peerNameByChat]);

  const filtered = useMemo(() => {
    if (!q.trim()) return withDisplayNames;
    const s = q.trim().toLowerCase();
    return withDisplayNames.filter((x) => (x.title || "").toLowerCase().includes(s));
  }, [withDisplayNames, q]);

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

            {filtered.map((it) => (
              <button
                key={it.id}
                className="dm-item"
                onClick={() => openWindow({ chatId: it.id, title: it.title || "(DM)" })}
                title={it.title || "(DM)"}
              >
                <div className="dm-avatar" aria-hidden />
                <div className="dm-meta">
                  <div className="dm-title">{it.title || "(DM)"}</div>
                  {it.lastMessageText && (
                    <div className="dm-sub">
                      {it.lastMessageText.slice(0, 36)}
                      {it.lastMessageText.length > 36 ? "…" : ""}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
