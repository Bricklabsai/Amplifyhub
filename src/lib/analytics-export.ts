import type { DailyMetric, PlatformMetric, PostMetric } from "@/lib/services/analyticsService";

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

export function buildAnalyticsCsv(payload: {
  generatedAt: string;
  days: number;
  daily: DailyMetric[];
  platforms: PlatformMetric[];
  topPosts: PostMetric[];
  liveTotals: {
    followers: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    posts: number;
    publishedInRange: number;
  };
  refreshError?: string | null;
}): string {
  const lines: string[] = [];

  lines.push("AmplifyHub Analytics Export");
  lines.push(row(["Generated At", payload.generatedAt]));
  lines.push(row(["Period (days)", payload.days]));
  if (payload.refreshError) {
    lines.push(row(["Refresh Warning", payload.refreshError]));
  }

  lines.push("");
  lines.push("SUMMARY");
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["Total Followers", payload.liveTotals.followers]));
  lines.push(row(["Total Reach", payload.liveTotals.reach]));
  lines.push(row(["Total Likes", payload.liveTotals.likes]));
  lines.push(row(["Total Comments", payload.liveTotals.comments]));
  lines.push(row(["Total Shares", payload.liveTotals.shares]));
  lines.push(row(["Published Posts (all time)", payload.liveTotals.posts]));
  lines.push(row(["Published Posts (in range)", payload.liveTotals.publishedInRange]));

  lines.push("");
  lines.push("DAILY METRICS");
  lines.push(
    row([
      "Date",
      "Followers",
      "Reach",
      "Impressions",
      "Engagement %",
      "Total Likes",
      "Total Comments",
      "Total Shares",
      "Likes (period)",
      "Comments (period)",
      "Shares (period)",
    ])
  );
  for (const d of payload.daily) {
    lines.push(
      row([
        d.dateLabel,
        d.followers,
        d.reach,
        d.impressions,
        d.engagement,
        d.likes,
        d.comments,
        d.shares,
        d.likesDelta,
        d.commentsDelta,
        d.sharesDelta,
      ])
    );
  }

  lines.push("");
  lines.push("BY PLATFORM");
  lines.push(
    row([
      "Platform",
      "Account",
      "Followers",
      "Likes",
      "Comments",
      "Shares",
      "Reach",
      "Posts",
    ])
  );
  for (const p of payload.platforms) {
    lines.push(
      row([
        p.platform,
        p.accountName,
        p.followers,
        p.likes,
        p.comments,
        p.shares,
        p.reach,
        p.posts,
      ])
    );
  }

  lines.push("");
  lines.push("TOP POSTS BY ENGAGEMENT");
  lines.push(
    row(["Post ID", "Title", "Platform", "Published", "Likes", "Comments", "Shares", "Reach"])
  );
  for (const p of payload.topPosts) {
    lines.push(
      row([
        p.postId,
        p.title,
        p.platform,
        p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "",
        p.likes,
        p.comments,
        p.shares,
        p.reach,
      ])
    );
  }

  return lines.join("\n");
}

export function downloadAnalyticsCsv(payload: Parameters<typeof buildAnalyticsCsv>[0]) {
  const csv = buildAnalyticsCsv(payload);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `amplifyhub_analytics_${payload.days}d_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
