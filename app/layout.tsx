import type { Metadata, Viewport } from "next";
import { myfont } from "./fonts";
import { StoreProvider } from "@/lib/store";
import DevNav from "@/components/DevNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "tamatar.si",
  description: "A red pen tutor for handwritten physics.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={myfont.variable}>
      <body>
        <StoreProvider>
          {children}
          {process.env.NODE_ENV !== "production" && <DevNav />}
        </StoreProvider>
      </body>
    </html>
  );
}
