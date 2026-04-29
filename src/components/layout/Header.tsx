"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="bg-navy" ref={menuRef}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left group: Logo + Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="heading text-xl text-white tracking-wider mr-4 hover:text-orange transition-colors">
              LOCKSY
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.landing.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`heading px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "text-orange border-b-2 border-orange"
                        : "text-white hover:text-orange"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Mobile: Logo only */}
          <Link href="/" className="md:hidden heading text-xl text-white tracking-wider hover:text-orange transition-colors">
            LOCKSY
          </Link>

          {/* Login Button */}
          <div className="hidden md:flex items-center">
            <Link
              href="/login"
              className="rounded-lg bg-orange px-6 py-2 text-sm font-normal text-navy hover:bg-orange-light transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.landing.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`heading block px-4 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? "text-orange bg-white/5"
                      : "text-white hover:text-orange hover:bg-white/5"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className="block rounded-lg bg-orange px-4 py-2 text-sm font-normal text-navy text-center hover:bg-orange-light transition-colors mt-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
