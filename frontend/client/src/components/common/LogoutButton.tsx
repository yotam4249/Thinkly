type Props = { onClick: () => void };

export function LogoutButton({ onClick }: Props) {
  return (
    <button
      className="btn-ghost focusable"
      onClick={onClick}
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 9999,
        background: "rgba(255,255,255,0.8)",
        padding: "6px 12px",
        borderRadius: 6,
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        fontWeight: 500,
      }}
    >
      Logout
    </button>
  );
}
