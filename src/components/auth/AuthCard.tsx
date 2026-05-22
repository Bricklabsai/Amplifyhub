import Link from "next/link";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-[420px] relative z-10">
      <div className="overflow-hidden rounded-2xl border border-[#7331FF]/12 bg-white/95 shadow-2xl shadow-[#7331FF]/10 backdrop-blur-xl">
        <div className="brand-gradient-bg px-8 py-6 text-center">
          <h2
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/85">{subtitle}</p>
        </div>

        <div className="p-8">{children}</div>

        {footer && (
          <div className="border-t border-gray-100 bg-gray-50/80 px-8 py-4 text-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthLogo() {
  return (
    <Link
      href="/"
      className="relative z-10 mb-8 text-center transition-opacity hover:opacity-90"
    >
      <span
        className="text-2xl font-bold text-[#111318]"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Amplify<span className="brand-gradient-text">Hub</span>
      </span>
    </Link>
  );
}
