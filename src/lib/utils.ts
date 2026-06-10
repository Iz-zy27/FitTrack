export function formatDate(d: string | Date) {
  return new Date(typeof d === "string" ? d + "T00:00:00" : d).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

export function monthLabel(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
