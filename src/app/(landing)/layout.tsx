import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/CookieBanner";
import { CookieConsentProvider } from "@/lib/cookie-consent";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CookieConsentProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </div>
    </CookieConsentProvider>
  );
}
