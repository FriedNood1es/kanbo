import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Job Tracker</h1>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/board" });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
        >
          Sign in with GitHub
        </button>
      </form>
    </div>
  );
}
