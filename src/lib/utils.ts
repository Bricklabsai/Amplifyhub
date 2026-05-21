import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

export const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2",
  TWITTER: "#1DA1F2",
  INSTAGRAM: "#E1306C",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#000000",
  YOUTUBE: "#FF0000",
  WHATSAPP: "#25D366",
};

export const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  TWITTER: "X (Twitter)",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  WHATSAPP: "WhatsApp",
};
