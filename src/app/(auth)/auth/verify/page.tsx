export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <svg
            className="h-6 w-6 text-brand"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
        <p className="text-muted">
          A sign-in link has been sent to your email address. Click the link in the email to sign in.
        </p>
        <p className="text-sm text-subtle">
          If you don't see the email, check your spam folder.
        </p>
      </div>
    </div>
  );
}
