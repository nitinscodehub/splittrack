"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

export function OtpInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function update(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join("").slice(0, LENGTH));
      return;
    }

    const next = digits.slice();
    let cursor = index;
    for (const character of clean) {
      if (cursor >= LENGTH) break;
      next[cursor] = character;
      cursor += 1;
    }
    onChange(next.join("").slice(0, LENGTH));
    refs.current[Math.min(cursor, LENGTH - 1)]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const next = digits.slice();
        next[index] = "";
        onChange(next.join(""));
        return;
      }
      event.preventDefault();
      const previous = Math.max(0, index - 1);
      const next = digits.slice();
      next[previous] = "";
      onChange(next.join(""));
      refs.current[previous]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  return (
    <div
      className="flex justify-between gap-2"
      role="group"
      aria-label="6-digit verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={digit}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={LENGTH}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          className={cn(
            "h-14 w-full min-w-0 rounded-xl border-2 border-input bg-background/70 text-center font-display text-2xl font-extrabold shadow-sm transition-all",
            "focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            digit ? "border-primary/40 text-foreground" : "text-muted-foreground",
          )}
        />
      ))}
    </div>
  );
}
