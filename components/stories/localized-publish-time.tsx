"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  value: Date | string | null;
  className?: string;
};

function formatLocalDate(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function LocalizedPublishTime({ value, className }: Props) {
  const isoValue = useMemo(() => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }, [value]);

  const [label, setLabel] = useState(() => formatLocalDate(value));

  useEffect(() => {
    setLabel(formatLocalDate(value));
  }, [value]);

  if (!isoValue || !label) return null;

  return (
    <time dateTime={isoValue} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
