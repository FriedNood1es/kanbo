import { signIn } from "@/lib/auth";
import { startDemoSession } from "@/actions/demo";
import Button from "@/components/ui/Button";
import KanboMark from "@/components/ui/KanboMark";
import ThemeToggle from "@/components/ui/ThemeToggle";
import StageTravelPreview from "@/components/ui/StageTravelPreview";

function GitHubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.86-3.06.86-2.36 0-4.36-1.6-5.07-3.75H.96v2.33A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.93 10.67a5.4 5.4 0 0 1 0-3.34V5H.96a9 9 0 0 0 0 8l2.97-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.57-2.57A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .96 5l2.97 2.33C4.64 5.18 6.64 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-12 p-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-5">
        <StageTravelPreview />
        <div className="flex items-center gap-2">
          <KanboMark className="h-14 w-14" />
          <h1 className="label-stamp text-6xl font-semibold text-ink">Kanbo</h1>
        </div>
        <p className="text-xl text-ink-dim">A Kanban board for your job search</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3.5">
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/board" });
          }}
        >
          <Button type="submit" variant="secondary" className="w-full gap-3 py-4 text-lg">
            <GitHubIcon />
            Sign in with GitHub
          </Button>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/board" });
          }}
        >
          <Button type="submit" variant="secondary" className="w-full gap-3 py-4 text-lg">
            <GoogleIcon />
            Sign in with Google
          </Button>
        </form>

        <div className="flex items-center gap-3 py-1 text-sm text-ink-faint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={startDemoSession}>
          <Button type="submit" variant="primary" className="w-full gap-3 py-4 text-lg">
            Explore a live demo
          </Button>
        </form>
        <p className="text-center text-sm text-ink-faint">
          No account needed — loads a sample board you can drag around.
        </p>
      </div>
    </div>
  );
}
