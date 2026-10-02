import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbux — Email Marketing, Built for Deliverability",
  description: "Campaigns, contacts, automation and inbox health in one focused workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
