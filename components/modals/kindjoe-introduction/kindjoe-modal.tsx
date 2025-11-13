"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import KindJoeHeroContent from "./kindjoe-hero-content";
import KindJoeModalForm from "./kindjoe-modal-form";
import { useKindJoeModalState } from "./kindjoe-modal-state";

export default function KindJoeModal() {
  const {
    derivedOpen,
    modalRef,
    handleClose,
    showForm,
    setShowForm,
    hasSubscribedFlag,
    setHasSubscribedFlag,
  } = useKindJoeModalState();

  if (!derivedOpen) return null;

  const handleAlreadySubscribed = () => {
    try {
      window.localStorage.setItem("kj_already_subscribed", "1");
    } catch {}

    setHasSubscribedFlag(true);
    handleClose(); // ✅ actually hide the modal now
  };

  return (
    <AnimatePresence>
      <motion.div
        key="kj-overlay"
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          key="kj-content"
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="relative w-full max-w-5xl rounded-4xl shadow-2xl overflow-hidden border
                       bg-white/95 dark:bg-neutral-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full
              bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/20
              hover:bg-white dark:hover:bg-white/20 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 sm:p-8 lg:p-10 text-slate-900 dark:text-white">
              <div className="flex justify-center mb-4">
                <Image
                  src="/brand/square-logo.svg"
                  width={100}
                  height={100}
                  alt="Kind Joe Logo"
                />
              </div>

              {showForm ? (
                <KindJoeModalForm
                  onBack={() => setShowForm(false)}
                  onSuccess={() => {
                    setHasSubscribedFlag(true); // prevent re-open in this session
                    handleClose(); // actually hide modal
                  }}
                />
              ) : (
                <KindJoeHeroContent
                  onJoinClick={() => setShowForm(true)}
                  hasSubscribedFlag={hasSubscribedFlag}
                  onAlreadySubscribed={handleAlreadySubscribed}
                />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
