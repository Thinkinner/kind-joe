"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export type AuthTurnstileFieldProps = {
  className?: string;
};

/** Renders Turnstile when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set; otherwise null. */
export const AuthTurnstileField = forwardRef<
  TurnstileInstance | null,
  AuthTurnstileFieldProps
>(function AuthTurnstileField({ className }, ref) {
  if (!siteKey) return null;

  return (
    <div className={cn("flex w-full justify-center overflow-hidden", className)}>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        options={{ size: "flexible", theme: "auto" }}
      />
    </div>
  );
});

export function isTurnstileEnabled(): boolean {
  return Boolean(siteKey);
}
