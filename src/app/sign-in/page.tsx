import { signIn } from "@/lib/auth";
import Button from "@/components/ui/Button";
import KanboMark from "@/components/ui/KanboMark";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="label-stamp text-sm text-ink-faint">Applied · Interviewing · Offer</span>
        <div className="flex items-center gap-1">
          <KanboMark className="h-8 w-8" />
          <h1 className="label-stamp text-3xl font-semibold text-ink">Kanbo</h1>
        </div>
        <p className="text-base text-ink-dim">A Kanban board for your job search</p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/board" });
        }}
      >
        <Button type="submit" className="px-6 py-3 text-base">
          Sign in with GitHub
        </Button>
      </form>
    </div>
  );
}
