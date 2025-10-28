export function DayDivider({ isoDay }: { isoDay: string }) {
    const label = new Date(isoDay).toLocaleDateString();
    return <div className="day-divider">{label}</div>;
  }
  