"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UserFormData, FormErrors } from "./types";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  error,
  icon,
  className,
  ...inputProps
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {icon}
          </span>
        )}

        <Input
          id={id}
          className={`h-11 ${icon ? "pl-9" : ""} ${
            error ? "border-red-500 focus-visible:ring-red-500" : ""
          } ${className ?? ""}`}
          {...inputProps}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

export const RegistrationModal: React.FC = () => {
  const autoOpenKey = "registration_modal_dismissed";
  const modalRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isVisible, setIsVisible] = useState(false);

  // Form State
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    zipCode: "",
    agreedToTerms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Auto-open once
  useEffect(() => {
    const dismissed = localStorage.getItem(autoOpenKey);

    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        document.body.style.overflow = "hidden";
      }, 10000); // 10,000ms = 10 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const closeModal = () => {
    localStorage.setItem(autoOpenKey, "dismissed");
    setIsVisible(false);
    document.body.style.overflow = "unset";
  };

  // Close on ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (isVisible) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible]);

  if (!isVisible) return null;

  //---------------------------------------
  // FORM VALIDATION
  //---------------------------------------
  const validate = (data: UserFormData): FormErrors => {
    const newErrors: FormErrors = {};

    if (!data.firstName.trim()) newErrors.firstName = "First name is required";
    if (!data.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!data.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!data.zipCode.trim()) {
      newErrors.zipCode = "Zip code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(data.zipCode)) {
      newErrors.zipCode = "Please enter a valid ZIP code";
    }

    if (!data.agreedToTerms) {
      newErrors.agreedToTerms = "You must agree to the terms to continue";
    }

    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/ventura-subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          zipCode: formData.zipCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Newsletter signup failed:", data);
        // You can surface this to the UI if you want:
        // setErrors((prev) => ({ ...prev, serverError: data?.error || "Something went wrong." }));
        return;
      }

      // success
      setIsCompleted(true);

      setTimeout(() => {
        closeModal();
      }, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  //---------------------------------------
  // RENDER
  //---------------------------------------

  const maxWidth = "3xl";

  const maxWidthClasses: Record<string, string> = {
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={closeModal}
      />

      {/* PANEL */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`relative w-full rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-slide-up ${maxWidthClasses[maxWidth]}`}
        >
          {/* CLOSE BUTTON */}
          <button
            className="absolute top-4 right-4 z-20 rounded-full p-2 bg-white/80 backdrop-blur-lg hover:bg-white shadow-md transition"
            onClick={closeModal}
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>

          {/* CONTENT */}
          {isCompleted ? (
            <div className="flex flex-col items-center justify-center py-12 px-8 animate-fade-in min-h-[400px]">
              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center mb-6 shadow-xl shadow-green-200">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                You're Subscribed!
              </h3>

              <p className="text-slate-500 text-center max-w-xs">
                Thanks for joining the Ventura County Newsletter. You'll start
                receiving updates soon!
              </p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row min-h-[550px]">
              {/* LEFT SIDE */}
              <div className="relative w-full md:w-2/5 bg-slate-900 p-8 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-900 to-red-600 opacity-90" />
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-900 rounded-full mix-blend-overlay filter blur-3xl opacity-30" />
                <div className="absolute top-1/2 -right-24 w-64 h-64 bg-red-400 rounded-full mix-blend-overlay filter blur-3xl opacity-30" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium border border-white/10 mb-6">
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                    <span>Subscribe for Local Updates</span>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                    Stay Informed with{" "}
                    <span className="text-blue-200">Ventura County News</span>.
                  </h2>

                  <p className="text-blue-100/80 text-sm leading-relaxed">
                    Get important updates, community alerts, and local events
                    delivered weekly.
                  </p>
                </div>

                <div className="relative z-10 mt-8">
                  <div className="flex items-center gap-3 text-xs text-blue-200/60">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-[8px]"
                        >
                          {i}
                        </div>
                      ))}
                    </div>
                    <span>Serving residents across Ventura County</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: FORM */}
              <div className="w-full md:w-3/5 p-8 bg-white flex flex-col justify-center">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Subscribe to the Ventura County Newsletter
                </h3>
                <p className="text-sm text-slate-500 mb-8">
                  Join thousands of residents receiving weekly updates.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <TextField
                      id="firstName"
                      name="firstName"
                      label="First Name"
                      placeholder="Jane"
                      value={formData.firstName}
                      onChange={handleChange}
                      error={errors.firstName}
                    />

                    <TextField
                      id="lastName"
                      name="lastName"
                      label="Last Name"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      error={errors.lastName}
                    />
                  </div>

                  <TextField
                    id="email"
                    name="email"
                    type="email"
                    label="Email Address"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    icon={<Mail className="w-4 h-4" />}
                  />

                  <div className="grid grid-cols gap-5">
                    <TextField
                      id="zipCode"
                      name="zipCode"
                      label="Zip Code"
                      placeholder="12345"
                      value={formData.zipCode}
                      onChange={handleChange}
                      error={errors.zipCode}
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  </div>

                  {/* TERMS */}
                  <div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreedToTerms"
                        checked={formData.agreedToTerms}
                        onCheckedChange={(checked) =>
                          handleChange({
                            target: {
                              name: "agreedToTerms",
                              type: "checkbox",
                              checked: Boolean(checked),
                              value: "",
                            },
                          } as any)
                        }
                        className="h-5 w-5 border-slate-300 text-blue-600 data-[state=checked]:bg-blue-600"
                      />

                      <label
                        htmlFor="agreedToTerms"
                        className="text-sm leading-6 text-slate-700 cursor-pointer"
                      >
                        I agree to the terms
                        <p className="text-slate-500">
                          By checking this, you agree to our{" "}
                          <a className="text-blue-600 hover:underline">
                            Privacy Policy
                          </a>{" "}
                          and{" "}
                          <a className="text-blue-600 hover:underline">
                            Terms of Service
                          </a>
                          .
                        </p>
                      </label>
                    </div>

                    {errors.agreedToTerms && (
                      <p className="text-sm text-red-600 mt-1 pl-8">
                        {errors.agreedToTerms}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 text-slate-500 hover:text-slate-900"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      variant="default"
                      className="flex-[2] bg-red-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Subscribing..."
                      ) : (
                        <span className="flex items-center gap-2">
                          Join Newsletter
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;
