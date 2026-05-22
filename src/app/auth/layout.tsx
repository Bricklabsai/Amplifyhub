"use client";

import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { AuthLogo } from "@/components/auth/AuthCard";

const SOCIAL_ICONS = [
  { Icon: FaFacebook, color: "#1877F2", className: "top-[10%] left-[8%]" },
  { Icon: FaXTwitter, color: "#111318", className: "top-[20%] right-[10%]" },
  { Icon: FaInstagram, color: "#E1306C", className: "bottom-[25%] left-[12%]" },
  { Icon: FaLinkedin, color: "#0A66C2", className: "bottom-[15%] right-[8%]" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      {SOCIAL_ICONS.map(({ Icon, color, className }) => (
        <div
          key={`${color}-${className}`}
          className={`absolute ${className} flex h-16 w-16 items-center justify-center rounded-2xl`}
          style={{
            background: `${color}12`,
            border: `1px solid ${color}22`,
            animation: "auth-float 6s ease-in-out infinite",
          }}
        >
          <Icon style={{ color, fontSize: "2rem" }} />
        </div>
      ))}

      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #7331FF33 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, #FFC01E44 0%, transparent 70%)" }}
      />

      <AuthLogo />
      {children}

      <style jsx global>{`
        .auth-page-bg {
          background: linear-gradient(
            145deg,
            rgba(115, 49, 255, 0.07) 0%,
            #ffffff 42%,
            rgba(255, 192, 30, 0.09) 100%
          );
        }
        @keyframes auth-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
      `}</style>
    </div>
  );
}
