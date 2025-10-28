/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { listChats, createChat, joinGroup } from "../services/chat.service";
// import AuthService from "../services/auth.service";
// import "../styles/home.css";

// import type { ChatListItem } from "../types/chatList.type";
// import avatarIcon from "../assets/avatar.svg";
// import groupIcon from "../assets/group.svg";

// function fmt(iso?: string) {
//   return iso ? new Date(iso).toLocaleString() : "";
// }

// export default function Home() {
//   const navigate = useNavigate();

//   const [items, setItems] = useState<ChatListItem[]>([]);
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const sentinelRef = useRef<HTMLDivElement | null>(null);

//   const [showNewChat, setShowNewChat] = useState(false);
//   const [creating, setCreating] = useState(false);
//   const [newTitle, setNewTitle] = useState("");
//   const [newType, setNewType] = useState<"dm" | "group">("group");
//   const [newMembers, setNewMembers] = useState("");
//   const [createErr, setCreateErr] = useState<string | null>(null);

//   const [joiningId, setJoiningId] = useState<string | null>(null);
//   const [joinErr, setJoinErr] = useState<string | null>(null);
//   const isJoining = (id: string) => joiningId === id;

//   const load = async (p: number) => {
//     if (loading) return;
//     setLoading(true);
//     setErr(null);
//     try {
//       const res = await listChats(p, 15);
//       setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
//       setHasMore(res.hasMore);
//       setPage(res.page);
//     } catch (e: any) {
//       setErr(e?.response?.data?.code ?? "FAILED_TO_LOAD_CHATS");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load(1);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     if (!hasMore || !sentinelRef.current) return;
//     const el = sentinelRef.current;

//     const io = new IntersectionObserver(
//       (entries) => {
//         const first = entries[0];
//         if (first.isIntersecting && !loading) {
//           load(page + 1);
//         }
//       },
//       { rootMargin: "200px 0px" }
//     );

//     io.observe(el);
//     return () => io.disconnect();
//   }, [hasMore, page, loading]);

//   // Logout button handler
//   const handleLogout = async () => {
//     try {
//       await AuthService.logout();
//     } catch {
//       // ignore network errors; tokens are cleared anyway
//     } finally {
//       navigate("/login");
//     }
//   };

//   const handleCreate = async () => {
//     if (newType === "group" && !newTitle.trim()) {
//       setCreateErr("TITLE_REQUIRED");
//       return;
//     }

//     const members = newMembers
//       .split(",")
//       .map((s) => s.trim())
//       .filter(Boolean);

//     if (newType === "dm" && members.length !== 1) {
//       setCreateErr("DM_MUST_HAVE_EXACTLY_ONE_OTHER_MEMBER");
//       return;
//     }

//     setCreating(true);
//     setCreateErr(null);
//     try {
//       const payloadMembers = members.length ? members : undefined;

//       const { chatId, reused } = await createChat(
//         newType,
//         newType === "group" ? newTitle.trim() : undefined,
//         payloadMembers
//       );

//       const computedTitle =
//         newType === "group" ? (newTitle.trim() || "(untitled)") : "(DM)";

//       if (!reused) {
//         setItems((prev) => [
//           {
//             id: chatId,
//             type: newType,
//             title: computedTitle,
//             lastMessageText: "",
//             lastMessageAt: new Date().toISOString(),
//             isMember: true, // creator is member
//           },
//           ...prev,
//         ]);
//       }

//       setNewTitle("");
//       setNewMembers("");
//       setNewType("group");
//       setShowNewChat(false);

//       navigate(`/chat/${chatId}`, { state: { title: computedTitle } });
//     } catch (e: any) {
//       setCreateErr(e?.response?.data?.code ?? "FAILED_TO_CREATE_CHAT");
//     } finally {
//       setCreating(false);
//     }
//   };

//   const handleJoin = async (chatId: string) => {
//     setJoinErr(null);
//     setJoiningId(chatId);
//     try {
//       await joinGroup(chatId);
//       setItems((prev) =>
//         prev.map((it) => (it.id === chatId ? { ...it, isMember: true } : it))
//       );
//       const title =
//         items.find((x) => x.id === chatId)?.title || "(untitled)";
//       navigate(`/chat/${chatId}`, { state: { title } });
//     } catch (e: any) {
//       setJoinErr(e?.response?.data?.code ?? "FAILED_TO_JOIN_GROUP");
//     } finally {
//       setJoiningId(null);
//     }
//   };

//   return (
//     <div className="shell">
//       {/* ✅ Fixed Logout Button */}
//       <button
//         className="btn-ghost focusable"
//         onClick={handleLogout}
//         style={{
//           position: "fixed",
//           top: "12px",
//           left: "12px",
//           zIndex: 9999,
//           background: "rgba(255,255,255,0.8)",
//           padding: "6px 12px",
//           borderRadius: "6px",
//           boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
//           fontWeight: 500,
//         }}
//       >
//         Logout
//       </button>

//       <div className="gradient-bg" />

//       <div className="card">
//         {/* header */}
//         <header
//           className="sticky-header"
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
//             <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>
//               Chats
//             </h1>
//             <span className="count-pill">{items.length}</span>
//           </div>

//           <button
//             className="new-chat-btn focusable"
//             onClick={() => setShowNewChat(true)}
//             aria-haspopup="dialog"
//             aria-expanded={showNewChat}
//             aria-controls="new-chat-modal"
//           >
//             + New Chat
//           </button>
//         </header>

//         {/* errors */}
//         {err && <div className="toast error" role="alert">{err}</div>}
//         {joinErr && <div className="toast error" role="alert">{joinErr}</div>}

//         {/* body */}
//         <div className="card-body">
//           {!loading && !items.length && !err && (
//             <div className="center" style={{ textAlign: "center", padding: "56px 10px 40px" }}>
//               <div className="empty-illustration" />
//               <h3 style={{ margin: "6px 0 4px" }}>No chats yet</h3>
//               <p className="text-muted" style={{ marginTop: 4, marginBottom: 14 }}>
//                 Create your first chat to get the conversation started.
//               </p>
//             </div>
//           )}

//           <ul className="list chat-list">
//             {items.map((c) => {
//               const isGroup = c.type === "group";
//               return (
//                 <li
//                   key={c.id}
//                   className="list-item chat-item"
//                 >
//                   <img
//                     src={avatarIcon}
//                     alt=""
//                     className="avatar-img"
//                     width={34}
//                     height={34}
//                     aria-hidden="true"
//                   />

//                   <div className="item-info">
//                     <div className="item-title-row">
//                       <div className="item-title">
//                         {c.title || "(untitled)"}
//                       </div>
//                       <span className="badge">
//                         <img
//                           src={isGroup ? groupIcon : avatarIcon}
//                           alt=""
//                           width={14}
//                           height={14}
//                           style={{ opacity: 0.9 }}
//                         />
//                         <span className="badge-label">
//                           {isGroup ? "Group" : "DM"}
//                         </span>
//                       </span>
//                     </div>

//                     <div className="item-sub">
//                       {c.lastMessageText || "No messages yet"}
//                     </div>
//                   </div>

//                   <div
//                     className="item-right"
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     <div className="item-time">{fmt(c.lastMessageAt)}</div>

//                     {isGroup ? (
//                       c.isMember ? (
//                         <button
//                           className="btn-primary focusable"
//                           onClick={() =>
//                             navigate(`/chat/${c.id}`, {
//                               state: { title: c.title || "(untitled)" },
//                             })
//                           }
//                         >
//                           Enter chat
//                         </button>
//                       ) : (
//                         <button
//                           className="btn-ghost focusable"
//                           onClick={() => !isJoining(c.id) && handleJoin(c.id)}
//                           disabled={isJoining(c.id)}
//                           style={{ minWidth: 96 }}
//                         >
//                           {isJoining(c.id) ? <span className="spinner" /> : "Join"}
//                         </button>
//                       )
//                     ) : (
//                       <button
//                         className="btn-primary focusable"
//                         onClick={() =>
//                           navigate(`/chat/${c.id}`, {
//                             state: { title: c.title || "(untitled)" },
//                           })
//                         }
//                       >
//                         Open
//                       </button>
//                     )}
//                   </div>
//                 </li>
//               );
//             })}
//           </ul>

//           {hasMore && (
//             <div className="center" style={{ padding: "8px 0 6px" }}>
//               <button
//                 className="load-more-btn btn-ghost focusable"
//                 onClick={() => load(page + 1)}
//                 disabled={loading}
//               >
//                 {loading ? <span className="spinner" /> : "Load more"}
//               </button>
//             </div>
//           )}

//           <div ref={sentinelRef} className="sentinel" />
//         </div>
//       </div>

//       {/* modal */}
//       <div
//         className={`modal-backdrop ${showNewChat ? "show" : ""}`}
//         onClick={() => !creating && setShowNewChat(false)}
//         aria-hidden={!showNewChat}
//       >
//         {showNewChat && (
//           <div
//             id="new-chat-modal"
//             className="modal animate-in"
//             role="dialog"
//             aria-modal="true"
//             aria-label="Create a new chat"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <h2 style={{ marginTop: 0 }}>Create a New Chat</h2>

//             {createErr && <div className="toast error compact" role="alert">{createErr}</div>}

//             <label className="field">
//               <span>
//                 Title {newType === "dm" && <span className="text-muted">(ignored for DM)</span>}
//               </span>
//               <input
//                 className="input"
//                 type="text"
//                 value={newTitle}
//                 onChange={(e) => setNewTitle(e.target.value)}
//                 placeholder="Project Alpha, Weekend Group, …"
//                 disabled={newType === "dm"}
//               />
//             </label>

//             <fieldset className="radios" aria-label="Chat type">
//               <label className="radio-pill">
//                 <input
//                   type="radio"
//                   name="chat-type"
//                   value="group"
//                   checked={newType === "group"}
//                   onChange={() => setNewType("group")}
//                 />
//                 Group
//               </label>
//               <label className="radio-pill">
//                 <input
//                   type="radio"
//                   name="chat-type"
//                   value="dm"
//                   checked={newType === "dm"}
//                   onChange={() => setNewType("dm")}
//                 />
//                 DM
//               </label>
//             </fieldset>

//             <label className="field">
//               <span>
//                 Members{" "}
//                 <span className="text-muted">
//                   {newType === "dm" ? "(required)" : "(optional)"}
//                 </span>
//               </span>
//               <input
//                 className="input"
//                 type="text"
//                 value={newMembers}
//                 onChange={(e) => setNewMembers(e.target.value)}
//                 placeholder={newType === "dm" ? "recipientUserId" : "userId1, userId2, …"}
//               />
//               <small className="small">
//                 {newType === "dm"
//                   ? "For a DM, enter exactly one userId (the recipient)."
//                   : "Leave empty to start with just you; you can invite later."}
//               </small>
//             </label>

//             <div className="modal-actions">
//               <button
//                 className="btn-ghost focusable"
//                 onClick={() => setShowNewChat(false)}
//                 disabled={creating}
//               >
//                 Cancel
//               </button>
//               <button
//                 className="btn-primary focusable"
//                 onClick={handleCreate}
//                 disabled={creating}
//               >
//                 {creating ? <span className="spinner" /> : "Create chat"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
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
