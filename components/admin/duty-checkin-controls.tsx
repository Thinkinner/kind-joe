"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CheckinState = {
  workingToday: boolean;
  workingKindJoe: boolean;
} | null;

type DutyCheckinControlsProps = {
  /** Compact control for the top bar / more menu */
  variant?: "banner" | "inline";
};

export function DutyCheckinControls({ variant = "banner" }: DutyCheckinControlsProps) {
  const [loaded, setLoaded] = useState(false);
  const [dutyDate, setDutyDate] = useState<string>("");
  const [checkin, setCheckin] = useState<CheckinState>(null);
  const [step, setStep] = useState<"working" | "kindjoe" | null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/duty-checkin");
      if (!res.ok) return;
      const data = (await res.json()) as {
        dutyDate: string;
        checkin: CheckinState;
      };
      setDutyDate(data.dutyDate);
      setCheckin(data.checkin);
      if (!data.checkin) {
        setStep("working");
      }
    } catch {
      // ignore — check-in is non-blocking
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (workingToday: boolean, workingKindJoe: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/duty-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingToday, workingKindJoe }),
      });
      if (!res.ok) {
        toast.error("Could not save duty check-in");
        return;
      }
      const data = (await res.json()) as {
        checkin: { workingToday: boolean; workingKindJoe: boolean };
      };
      setCheckin(data.checkin);
      setStep(null);
      setEditOpen(false);
      if (data.checkin.workingKindJoe) {
        toast.success("You're on Kind Joe duty today");
      } else if (data.checkin.workingToday) {
        toast.message("Checked in — not on Kind Joe today");
      } else {
        toast.message("Marked as not working today");
      }
    } catch {
      toast.error("Could not save duty check-in");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  const statusLabel = !checkin
    ? "Not checked in"
    : checkin.workingKindJoe
      ? "On Kind Joe"
      : checkin.workingToday
        ? "Working (not Kind Joe)"
        : "Off today";

  return (
    <>
      {variant === "inline" ? (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground transition hover:text-foreground"
          onClick={() => {
            setEditOpen(true);
            setStep("working");
          }}
        >
          Duty: <span className="font-medium text-foreground">{statusLabel}</span>
        </button>
      ) : checkin ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">Duty</span>
          <span className="font-medium text-foreground">{statusLabel}</span>
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            onClick={() => {
              setEditOpen(true);
              setStep("working");
            }}
          >
            Change
          </button>
        </div>
      ) : null}

      <Dialog
        open={step !== null || editOpen}
        onOpenChange={(open) => {
          if (!open && checkin) {
            setStep(null);
            setEditOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={Boolean(checkin)}>
          <DialogHeader>
            <DialogTitle>
              {step === "kindjoe" ? "Working on Kind Joe?" : "Working today?"}
            </DialogTitle>
            <DialogDescription>
              {dutyDate
                ? `Duty date ${dutyDate} (America/Los_Angeles). `
                : null}
              People checked in for Kind Joe get auto-assigned links from Slack.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {step === "working" || (!step && editOpen) ? (
              <>
                <Button
                  disabled={saving}
                  onClick={() => {
                    setEditOpen(true);
                    setStep("kindjoe");
                  }}
                >
                  Yes, I&apos;m working today
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => void save(false, false)}
                >
                  No, not working today
                </Button>
              </>
            ) : null}

            {step === "kindjoe" ? (
              <>
                <Button
                  disabled={saving}
                  onClick={() => void save(true, true)}
                >
                  Yes, working on Kind Joe
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => void save(true, false)}
                >
                  Working, but not Kind Joe
                </Button>
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setStep("working")}
                >
                  Back
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
