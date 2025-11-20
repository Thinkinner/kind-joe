import React, { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { FormData, FormErrors, RecapType, SubmissionStatus } from "./types";

const KindJoeMo: React.FC = () => {
  // --- State ---
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    zipCode: "",
    recapType: null, // ✅ can be null now
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>(SubmissionStatus.IDLE);

  // --- Validation ---
  const validateField = (
    name: keyof FormData,
    value: string
  ): string | undefined => {
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value.trim())
          return `${name === "firstName" ? "First" : "Last"} name is required`;
        if (value.length < 2) return "Must be at least 2 characters";
        return undefined;

      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email address";
        return undefined;

      case "zipCode":
        if (!value.trim()) return "Zip code is required";
        if (!/^\d{5}(-\d{4})?$/.test(value))
          return "Must be a valid US zip code (e.g., 90210)";
        return undefined;

      case "recapType": {
        const validRecapTypes = [
          "Republican",
          "Democratic",
          "American Party",
          "All",
        ];
        if (!value || !validRecapTypes.includes(value)) {
          return "Please select a recap preference";
        }
        return undefined;
      }

      default:
        return undefined;
    }
  };

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      const error = validateField(key, formData[key] as string);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    if (!isValid) return;

    setStatus(SubmissionStatus.SUBMITTING);

    try {
      const { email, firstName, lastName, recapType, zipCode } = formData;

      // 1) Create / update contact with recapType
      const postRes = await fetch("/api/newsletter-subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          recapType,
        }),
      });

      if (!postRes.ok) {
        const errorBody = await postRes.json().catch(() => null);
        throw new Error(
          errorBody?.error || "Failed to subscribe. Please try again."
        );
      }

      // 2) If zipCode is provided, send PUT to attach postalCode
      if (zipCode) {
        const putRes = await fetch("/api/newslettersubscriber", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, zipCode }),
        });

        if (!putRes.ok) {
          const errorBody = await putRes.json().catch(() => null);
          console.error(
            "Failed to update zip code:",
            errorBody?.error || putRes.statusText
          );
          // Not throwing here so a zip update failure doesn't block success state
        }
      }

      setStatus(SubmissionStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setStatus(SubmissionStatus.ERROR);
    }
  };

  const isSubmitting = status === SubmissionStatus.SUBMITTING;

  // --- Render ---

  if (status === SubmissionStatus.SUCCESS) {
    return (
      <div className="space-y-6 py-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full p-3 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              You&apos;re in ✨
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Thanks, {formData.firstName}. Your Kind Joe Top Stories is on the
              way.
            </p>
          </div>
        </div>

        <DialogClose asChild>
          <Button
            variant="outline"
            className="w-full border-border/70 hover:border-border rounded-sm"
            type="button"
          >
            Close
          </Button>
        </DialogClose>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-3">
      <DialogHeader className="space-y-3">
        <div className="space-y-1">
          <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Join the Kind Joe Daily Brief
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            Get Kind Joe’s Top Stories quick, skimmable news highlights,
            community updates, and political recaps personalized for you.
          </DialogDescription>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* First + Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-medium">
              First Name
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <User className="h-4 w-4 text-muted-foreground" />
              </span>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Jane"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`h-10 rounded-sm pl-9 text-sm transition-all focus-visible:ring-1 focus-visible:ring-red-600/70 ${
                  errors.firstName ? "border-destructive" : ""
                }`}
              />
            </div>
            {errors.firstName && (
              <p className="text-xs text-destructive mt-1">
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-medium">
              Last Name
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <User className="h-4 w-4 text-muted-foreground" />
              </span>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`h-10 rounded-sm pl-9 text-sm transition-all focus-visible:ring-1 focus-visible:ring-red-600/70 ${
                  errors.lastName ? "border-destructive" : ""
                }`}
              />
            </div>
            {errors.lastName && (
              <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email Address
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </span>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`h-10 rounded-sm pl-9 text-sm transition-all focus-visible:ring-1 focus-visible:ring-red-600/70 ${
                errors.email ? "border-destructive" : ""
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        {/* Recap Type */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="recapType" className="text-xs font-medium">
              Recap Preference
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Choose the kind of political recap you want.
            </span>
          </div>
          <Select
            disabled={isSubmitting}
            value={formData.recapType ?? undefined}
            onValueChange={(value) => {
              setFormData((prev) => ({
                ...prev,
                recapType: value as RecapType,
              }));
              if (errors.recapType) {
                setErrors((prev) => ({ ...prev, recapType: undefined }));
              }
            }}
          >
            <SelectTrigger
              id="recapType"
              className={`h-10 rounded-sm text-sm w-full ${
                errors.recapType ? "border-destructive" : ""
              }`}
            >
              <SelectValue placeholder="Select a recap preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Republican">Republican recap</SelectItem>
              <SelectItem value="Democratic">Democratic recap</SelectItem>
              <SelectItem value="American Party">
                American Party recap
              </SelectItem>
              <SelectItem value="All">All of the above</SelectItem>
            </SelectContent>
          </Select>

          {errors.recapType && (
            <p className="text-xs text-destructive mt-1">{errors.recapType}</p>
          )}
        </div>

        {/* Zip Code */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="zipCode" className="text-xs font-medium">
              Zip Code
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Helps us send you hyper-local picks.
            </span>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </span>
            <Input
              id="zipCode"
              name="zipCode"
              placeholder="93001"
              maxLength={10}
              value={formData.zipCode}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`h-10 rounded-sm pl-9 text-sm transition-all focus-visible:ring-1 focus-visible:ring-red-600/70 ${
                errors.zipCode ? "border-destructive" : ""
              }`}
            />
          </div>
          {errors.zipCode && (
            <p className="text-xs text-destructive mt-1">{errors.zipCode}</p>
          )}
        </div>

        {/* Submit */}
        <div className="space-y-2 pt-1.5">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-sm bg-red-700 hover:bg-red-800 focus-visible:ring-red-600/80 text-sm font-medium h-10 transition-all shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Subscribing...</span>
              </>
            ) : (
              <>
                <span>Get Kind Joe Top Stories</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-[11px] leading-relaxed text-center text-muted-foreground">
            By subscribing, you agree to our{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
            .
          </p>
        </div>

        {status === SubmissionStatus.ERROR && (
          <p className="text-xs text-destructive text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </div>
  );
};

export default KindJoeMo;
