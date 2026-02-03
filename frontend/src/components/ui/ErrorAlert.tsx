"use client";

interface ErrorAlertProps {
  message: string | null;
  className?: string;
}

export function ErrorAlert({ message, className = "" }: ErrorAlertProps) {
  if (!message) return null;
  return (
    <div
      className={`rounded-md bg-red-50 p-3 text-sm text-red-700 ${className}`}
    >
      {message}
    </div>
  );
}
