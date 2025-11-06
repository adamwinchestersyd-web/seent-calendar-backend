import React from "react";

type Toast = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  timeoutMs?: number;
};

const Ctx = React.createContext<{
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((s) => s.filter((x) => x.id !== id));
  }, []);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, timeoutMs: 5000, ...t };
    setToasts((s) => [...s, toast]);
    if (toast.timeoutMs) setTimeout(() => dismiss(id), toast.timeoutMs);
    return id;
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toasts, push, dismiss }}>
      {children}
      {/* Toast stack (bottom-right) */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="bg-gray-900 text-white rounded-lg shadow px-4 py-3 flex items-center gap-3">
            <span className="text-sm">{t.message}</span>
            {t.onAction && (
              <button
                className="text-xs underline decoration-2 underline-offset-4"
                onClick={() => t.onAction?.()}
              >
                {t.actionLabel || "Undo"}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("Wrap in <ToastProvider/>");
  return ctx;
}
