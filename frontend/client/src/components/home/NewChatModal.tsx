import type { Dispatch, SetStateAction } from "react";

type Props = {
  open: boolean;
  creating: boolean;
  createErr: string | null;
  newTitle: string;
  setNewTitle: Dispatch<SetStateAction<string>>;
  newType: "dm" | "group";
  setNewType: Dispatch<SetStateAction<"dm" | "group">>;
  newMembers: string;
  setNewMembers: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onCreate: () => void;
};

export function NewChatModal({
  open,
  creating,
  createErr,
  newTitle,
  setNewTitle,
  newType,
  setNewType,
  newMembers,
  setNewMembers,
  onClose,
  onCreate,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop show" onClick={() => !creating && onClose()}>
      <div
        className="modal animate-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-chat-title"
      >
        <h2 id="create-chat-title" className="modal-title">Create a New Chat</h2>

        {createErr && (
          <div className="toast error compact" role="alert">
            {createErr}
          </div>
        )}

        {/* Title */}
        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="input auth-input"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Project Alpha, Weekend Group, …"
          />
        </label>

        {/* Type */}
        <div className="field">
          <span className="field-label">Type</span>

          <div className="seg-group">
            <label className="seg">
              <input
                type="radio"
                name="chat-type"
                value="group"
                checked={newType === "group"}
                onChange={() => setNewType("group")}
              />
              <span>Group</span>
            </label>

            <label className="seg">
              <input
                type="radio"
                name="chat-type"
                value="dm"
                checked={newType === "dm"}
                onChange={() => setNewType("dm")}
              />
              <span>DM</span>
            </label>
          </div>
        </div>

        {/* Members */}
        <label className="field">
          <span className="field-label">Members (optional)</span>
          <input
            className="input auth-input"
            type="text"
            value={newMembers}
            onChange={(e) => setNewMembers(e.target.value)}
            placeholder="userId1, userId2, …"
          />
          <small className="small">Leave empty to start with just you.</small>
        </label>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onCreate} disabled={creating}>
            {creating ? <span className="spinner" aria-hidden /> : "Create chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
