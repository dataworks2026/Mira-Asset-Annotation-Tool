"use client";

import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Infrastructure Annotation
        </h1>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.full_name}
            </span>
            <button
              onClick={logout}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
