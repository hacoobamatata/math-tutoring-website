import {
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <a
          href="#home"
          className="text-base font-bold tracking-tight text-white sm:text-lg"
        >
          Jacob Xu
        </a>

        <div className="flex items-center gap-3 text-sm font-medium text-slate-300 sm:gap-6">
          <a href="#about" className="transition hover:text-white">
            About
          </a>

          <a href="#services" className="transition hover:text-white">
            Services
          </a>

          <a
            href="#contact"
            className="rounded-lg bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-500 sm:px-4"
          >
            Contact
          </a>

          <Show when="signed-out">
            <SignInButton />
          </Show>

          <Show when="signed-in">
            <a href="/dashboard" className="transition hover:text-white">
              Dashboard
            </a>
            <UserButton />
          </Show>
        </div>
      </nav>
    </header>
  );
}