"use client";
import * as React from "react";

export function useKindJoeModalState() {
  const [internalOpen, setInternalOpen] = React.useState(false); // start closed
  const [showForm, setShowForm] = React.useState(false);
  const [hasSubscribedFlag, setHasSubscribedFlag] = React.useState(false);

  const modalRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem("kj_already_subscribed");
      const alreadySubscribed = v === "1";
      setHasSubscribedFlag(alreadySubscribed);
      // Only open modal if not already subscribed
      setInternalOpen(!alreadySubscribed);
    } catch {
      // if localStorage fails, default to showing modal
      setInternalOpen(true);
    }
  }, []);

  const derivedOpen = internalOpen;
  const setOpen = setInternalOpen;

  const handleClose = () => setOpen(false);

  // ESC close + focus trap
  React.useEffect(() => {
    if (!derivedOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [derivedOpen]);

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
