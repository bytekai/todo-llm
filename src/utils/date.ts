export function formatDeadline(deadline: number | undefined): string {
  if (!deadline) return "No deadline";

  const date = new Date(deadline);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";
  return date.toLocaleDateString();
}

export function formatTime(hours: number | undefined): string {
  if (!hours || hours <= 0) return "1h";
  if (hours >= 1) return `${Math.round(hours)}h`;
  // For less than 1 hour, show in minutes
  return `${Math.round(hours * 60)}m`;
}
