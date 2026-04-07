import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Pineway",
  icons: {
    icon: "/pineway-logo-mark.svg",
  },
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full flex-col lg:flex-row">
      <main className="relative h-full w-full bg-white">{children}</main>
    </div>
  );
}
