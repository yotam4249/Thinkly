import React from "react";

export type ChatFilter = "groups" | "dms" | "other";

type Props = {
  value: ChatFilter;
  onChange: (v: ChatFilter) => void;
  counts: { groups: number; dms: number; other: number };
};

export function ChatFilterTabs({ value, onChange, counts }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Chat list filter">
      <button
        type="button"
        role="tab"
        aria-selected={value === "groups"}
        className={`tab ${value === "groups" ? "active" : ""}`}
        onClick={() => onChange("groups")}
      >
        Groups ({counts.groups})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "dms"}
        className={`tab ${value === "dms" ? "active" : ""}`}
        onClick={() => onChange("dms")}
      >
        DMs ({counts.dms})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "other"}
        className={`tab ${value === "other" ? "active" : ""}`}
        onClick={() => onChange("other")}
      >
        Other ({counts.other})
      </button>
    </div>
  );
}
