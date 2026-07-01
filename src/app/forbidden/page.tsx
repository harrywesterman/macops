export default function ForbiddenPage() {
  return (
    <main className="min-h-svh grid place-items-center p-6">
      <section className="panel w-full max-w-[460px] p-8">
        <h1 className="text-2xl font-bold">Geen toegang</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">Je Ping-account valt niet binnen Gebruikers Ondersteuning of LiMa.</p>
        <a className="text-button mt-6" href="/auth/logout">
          Uitloggen
        </a>
      </section>
    </main>
  );
}
