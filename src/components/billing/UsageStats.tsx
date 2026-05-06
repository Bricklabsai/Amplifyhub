"use client";
import { useEffect, useState } from "react";
import { HiPhotograph, HiPencilAlt, HiDocumentText } from "react-icons/hi";

interface UsageStatsProps {
  compact?: boolean;
}

export function UsageStats({ compact = false }: UsageStatsProps) {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/usage")
      .then((r) => r.json())
      .then((d) => {
        setUsage(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!usage) return null;

  const items = [
    {
      label: "Posts",
      current: usage.usage.posts,
      limit: usage.limits.posts,
      percentage: usage.percentages.posts,
      icon: HiDocumentText,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "AI Text",
      current: usage.usage.aiText,
      limit: usage.limits.aiText,
      percentage: usage.percentages.aiText,
      icon: HiPencilAlt,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "AI Image",
      current: usage.usage.aiImage,
      limit: usage.limits.aiImage,
      percentage: usage.percentages.aiImage,
      icon: HiPhotograph,
      color: "bg-pink-100 text-pink-600",
    },
  ];

  if (compact) {
    return (
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isNearLimit = item.percentage >= 80;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${item.color}`}>
                    <Icon className="text-sm" />
                  </div>
                  <span className="font-semibold text-gray-900">{item.label}</span>
                </div>
                <span className={`font-bold ${isNearLimit ? "text-red-600" : "text-gray-700"}`}>
                  {item.current}/{item.limit === 999999 ? "∞" : item.limit}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isNearLimit ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-pink-500"
                  }`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        const isNearLimit = item.percentage >= 80;
        return (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${item.color}`}>
                <Icon className="text-lg" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                isNearLimit 
                  ? "bg-red-100 text-red-700" 
                  : "bg-gray-100 text-gray-700"
              }`}>
                {item.percentage}%
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">{item.label}</p>
            <p className={`text-2xl font-black mb-3 ${isNearLimit ? "text-red-600" : "brand-gradient-text"}`}>
              {item.current}
              <span className="text-sm text-gray-500 font-normal">/{item.limit === 999999 ? "∞" : item.limit}</span>
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${
                  isNearLimit ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-pink-500"
                }`}
                style={{ width: `${Math.min(item.percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
