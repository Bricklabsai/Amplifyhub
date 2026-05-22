import { prisma } from "@/lib/prisma";
import { notifyPostEngagement } from "@/lib/notifications";
import { fetchPlatformPostEngagement } from "@/lib/social";

/**
 * Polls recent published posts for engagement deltas (cron / scheduler).
 */
export async function processEngagementAlerts(limit = 8): Promise<{ checked: number; notified: number }> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: since },
      platformPosts: { some: { externalId: { not: null } } },
    },
    include: {
      platformPosts: {
        where: { externalId: { not: null } },
        select: {
          id: true,
          externalId: true,
          socialAccountId: true,
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  let notified = 0;

  for (const post of posts) {
    const prevLikes = post.platformPosts.reduce((s, pp) => s + (pp.likes ?? 0), 0);
    const prevComments = post.platformPosts.reduce((s, pp) => s + (pp.comments ?? 0), 0);

    let newLikes = 0;
    let newComments = 0;

    for (const pp of post.platformPosts) {
      if (!pp.externalId) continue;
      try {
        const engagement = await fetchPlatformPostEngagement(
          pp.socialAccountId,
          pp.externalId
        );
        const likes = engagement?.likes ?? pp.likes ?? 0;
        const comments = engagement?.comments ?? pp.comments ?? 0;
        newLikes += likes;
        newComments += comments;

        await prisma.platformPost.update({
          where: { id: pp.id },
          data: { likes, comments },
        });
      } catch (e) {
        console.error(`[engagement-alerts] post ${post.id} platform ${pp.id}:`, e);
        newLikes += pp.likes ?? 0;
        newComments += pp.comments ?? 0;
      }
    }

    if (newLikes > prevLikes || newComments > prevComments) {
      const created = await notifyPostEngagement({
        userId: post.userId,
        postId: post.id,
        postLabel: post.title || post.content,
        prevLikes,
        prevComments,
        newLikes,
        newComments,
      });
      if (created) notified++;
    }
  }

  return { checked: posts.length, notified };
}
