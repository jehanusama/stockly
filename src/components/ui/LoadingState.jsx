import { Button } from "./Button";

export function LoadingState({ message = "Loading data..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] py-16 text-center">
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[var(--color-app-panel)] border border-[var(--color-app-border)] text-[var(--color-app-text-muted)] shadow-md">
        <svg className="animate-spin h-5 w-5 text-[var(--color-app-accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] py-16 text-center px-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-app-panel)] border border-[var(--color-app-danger)]/30 flex flex-col items-center gap-4 shadow-lg">
        <div className="w-12 h-12 rounded-full bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div className="flex flex-col gap-1 text-center">
          <h3 className="text-base font-bold text-[var(--color-app-text)]">Failed to load data</h3>
          <p className="text-xs text-[var(--color-app-text-muted)] max-w-xs mx-auto">
            {typeof error === "string" ? error : "An error occurred while communicating with Supabase."}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
