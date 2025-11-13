"use client";

import * as React from "react";

const SUB_KEY = "kj_already_subscribed";

export function useKindJoeModalState() {
  const modalRef = React.useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [hasSubscribedFlag, setHasSubscribedFlag] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user has already subscribed / dismissed
    const already = window.localStorage.getItem(SUB_KEY) === "1";
    setHasSubscribedFlag(already);

    // If they’re already subscribed, never show the modal
    if (already) return;

    // Show modal after 15 seconds
    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 15000);

    return () => window.clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setShowForm(false);
  };

  // Only consider the modal open if:
  // - the internal `open` flag is true
  // - AND they haven't marked themselves as subscribed
  const derivedOpen = open && !hasSubscribedFlag;

  return {
    derivedOpen,
    modalRef,
    handleClose,
    showForm,
    setShowForm,
    hasSubscribedFlag,
    setHasSubscribedFlag,
  };
}
