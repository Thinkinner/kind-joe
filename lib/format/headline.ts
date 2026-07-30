/** Soften shouty ALL-CAPS headlines for modern UI display. */
export function formatHeadline(title: string): string {
  const letters = title.replace(/[^a-zA-Z]/g, "");
  if (!letters.length) return title;

  const upperCount = [...letters].filter((c) => c === c.toUpperCase()).length;
  if (upperCount / letters.length < 0.7) return title;

  return title
    .toLowerCase()
    .replace(/(^|[\s\-—:/])([a-z])/g, (_, prefix: string, char: string) => {
      return `${prefix}${char.toUpperCase()}`;
    });
}
