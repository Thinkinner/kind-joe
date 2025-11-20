// lib/formatDate.ts

export function formatToLA(dateInput: Date | string | null): string {
  if (!dateInput) return "";

  const date = new Date(dateInput);

  return date.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}