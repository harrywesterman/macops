import { redirect } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { getOptionalUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getOptionalUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-svh grid place-items-center p-6">
      <section className="panel w-full max-w-[460px] p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-[#172124] text-white">
            <ShieldCheck size={23} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold">MacOps</h1>
            <p className="text-sm text-[var(--ink-muted)]">ABM en Jamf beheerportaal</p>
          </div>
        </div>
        <a className="text-button primary mt-8 w-full" href="/auth/login">
          <LogIn size={18} aria-hidden />
          Inloggen met Ping
        </a>
      </section>
    </main>
  );
}
