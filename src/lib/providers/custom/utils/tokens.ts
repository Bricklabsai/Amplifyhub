import type { SocialAccount } from "../../../../generated/client";
import { prisma } from "../../../prisma";
import { refreshAccessToken } from "../../../token-utils";

export async function getValidToken(account: SocialAccount): Promise<string | null> {
  let token = account.accessToken;
  
  if (account.expiresAt && new Date() >= account.expiresAt) {
    token = await refreshAccessToken(prisma, account.id);
  }
  
  return token || account.accessToken;
}
