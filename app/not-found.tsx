import Link from "next/link";

// Override the default 404 so it never renders in system-ui (ui_planning.md §1.3).
export default function NotFound() {
  return (
    <main className="grid-paper flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-[2.5rem]">this page rolled away</h1>
      <Link href="/" className="link text-[1.2rem] text-tomato">
        back home
      </Link>
    </main>
  );
}
