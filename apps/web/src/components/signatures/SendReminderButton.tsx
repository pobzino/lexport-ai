"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Mail } from "lucide-react";

interface SendReminderButtonProps {
  contractId: string | null;
  signatureRequestId: string;
  signerName: string;
}

type ReminderState = "idle" | "success" | "error";

export function SendReminderButton({
  contractId,
  signatureRequestId,
  signerName,
}: SendReminderButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<ReminderState>("idle");
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleReset = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setState("idle");
    }, 3000);
  };

  const handleClick = async () => {
    if (!contractId) {
      setState("error");
      scheduleReset();
      return;
    }

    setState("idle");

    try {
      const response = await fetch(`/api/contracts/${contractId}/reminders/${signatureRequestId}`, {
        method: "POST",
      });

      if (!response.ok) {
        setState("error");
        scheduleReset();
        return;
      }

      setState("success");
      scheduleReset();
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to send reminder:", error);
      setState("error");
      scheduleReset();
    }
  };

  const icon = isPending
    ? Loader2
    : state === "success"
      ? Check
      : state === "error"
        ? AlertCircle
        : Mail;

  const iconClassName = isPending
    ? "text-amber-600"
    : state === "success"
      ? "text-emerald-600"
      : state === "error"
        ? "text-red-600"
        : "text-slate-400 group-hover:text-amber-600";

  const title = isPending
    ? `Sending reminder to ${signerName}...`
    : !contractId
      ? `Cannot send reminder for ${signerName}`
    : state === "success"
      ? `Reminder sent to ${signerName}`
      : state === "error"
        ? `Failed to send reminder to ${signerName}`
        : `Send reminder to ${signerName}`;

  const Icon = icon;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || !contractId}
      className="group rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
      title={title}
      aria-label={title}
    >
      <Icon className={`h-4 w-4 ${iconClassName} ${isPending ? "animate-spin" : ""}`} />
    </button>
  );
}
