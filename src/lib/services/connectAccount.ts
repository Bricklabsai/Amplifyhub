import { prisma } from "../prisma";
import type { Platform } from "../../generated/client";

export interface ZernioConnectionResponse {
  zernioAccountId: string;
  accountName: string;
  platform: Platform;
}

/**
 * Persists the result of a successful Zernio OAuth handshake. The redirect
 * URL is generated server-side by `GET /api/connect/zernio` (which calls
 * `zernio.connect.getConnectUrl`); this function only handles the
 * post-callback database write.
 *
 * We deliberately do not store `accessToken`/`refreshToken` for accounts
 * connected via Zernio — the SDK owns the tokens and we identify the
 * account by `zernioAccountId`.
 */
export async function connectWithZernio(userId: string, data: ZernioConnectionResponse) {
  const { zernioAccountId, accountName, platform } = data;

  return await prisma.socialAccount.upsert({
    where: {
      userId_platform: {
        userId,
        platform,
      },
    },
    update: {
      zernioAccountId,
      accountName,
      isActive: true,
      updatedAt: new Date(),
      // Remove dependency on storing accessToken/refreshToken as per requirements
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    },
    create: {
      userId,
      platform,
      zernioAccountId,
      accountName,
      isActive: true,
    },
  });
}
