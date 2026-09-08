"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const FIELD_CLASS =
  "mt-2 w-full border-b-2 border-jf-ink bg-transparent py-3 outline-none focus:border-jf-red disabled:opacity-60";
const LABEL_CLASS =
  "text-xs font-bold uppercase tracking-widest text-jf-muted";

export function JoesFriendsContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");

  const sending = status === "sending";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/joes-friends-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      setForm({ name: "", email: "", message: "" });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="jf-stamp bg-jf-surface p-7 sm:p-9">
        <p className="font-jf-hand text-3xl text-jf-red">got it</p>
        <h2 className="mt-2 font-jf-display text-2xl uppercase">
          Message sent.
        </h2>
        <p className="mt-3 leading-relaxed text-jf-muted">
          Joe&apos;s Friends will get back to you shortly. If it&apos;s urgent,
          email{" "}
          <a
            href="mailto:newbusiness@kindjoe.com"
            className="font-bold text-jf-ink underline underline-offset-4 hover:text-jf-red"
          >
            newbusiness@kindjoe.com
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="jf-stamp mt-8 bg-jf-blue px-6 py-3 text-sm font-bold uppercase tracking-wide text-white"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="jf-stamp space-y-6 bg-jf-surface p-7 sm:p-9">
      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={sending}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={FIELD_CLASS}
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className={LABEL_CLASS}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={sending}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={FIELD_CLASS}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="message" className={LABEL_CLASS}>
          What do you need?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          disabled={sending}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={`${FIELD_CLASS} resize-none`}
          placeholder="Social management, editing, podcast, all of it..."
        />
      </div>

      {status === "error" && (
        <p className="text-sm font-bold text-jf-red" role="alert">
          That didn&apos;t send. Try again, or email newbusiness@kindjoe.com.
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="jf-stamp w-full bg-jf-red py-3.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {sending ? "Sending…" : "Send It"}
      </button>
    </form>
  );
}
