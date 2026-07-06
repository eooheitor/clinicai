"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BotMessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
];

export function LandingHeader() {
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "glass sticky top-0 z-50 border-b transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-border shadow-[0_8px_30px_rgba(15,23,20,0.06)]" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-white shadow-[0_4px_18px_var(--accent-glow)]">
            <BotMessageSquare className="size-4.5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-[-0.01em]">
            ClinicAI
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {authed ? (
            <Link href="/dashboard" className={cn(buttonVariants())}>
              Acessar painel
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "hidden sm:inline-flex"
                )}
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className={cn(
                  buttonVariants(),
                  "transition-transform hover:-translate-y-px"
                )}
              >
                Teste grátis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
