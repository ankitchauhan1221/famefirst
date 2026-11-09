"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

type Props = {
  action: string;
  submitLabel: string;
  redirectTo?: string;
  confirmText?: string;
  className?: string;
  buttonClassName?: string;
  resetOnSuccess?: boolean;
  children?: ReactNode;
};

export function ApiForm({ action, submitLabel, redirectTo, confirmText, className, buttonClassName = "btn", resetOnSuccess, children }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmText && !window.confirm(confirmText)) return;
    const form = event.currentTarget;
    const body: Record<string, unknown> = Object.fromEntries(new FormData(form));
    form.querySelectorAll<HTMLInputElement>("input[type=checkbox][name]").forEach((box) => {
      body[box.name] = box.checked;
    });
    form.querySelectorAll<HTMLInputElement>("input[type=hidden][data-bool]").forEach((input) => {
      body[input.name] = input.value === "true";
    });

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (redirectTo) {
        window.location.assign(redirectTo);
        return;
      }
      if (data.message) setMessage(data.message);
      if (resetOnSuccess) form.reset();
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={className}>
      {children}
      <button className={buttonClassName} disabled={busy}>
        {busy ? "Please wait…" : submitLabel}
      </button>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {message && <p className="alert alert-ok" role="status">{message}</p>}
    </form>
  );
}
