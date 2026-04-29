import type { SocialAccount } from "../../../generated/client";
import type { PublishResult } from "../../publishers";

export interface PlatformProvider {
  publish(account: SocialAccount, content: string, mediaUrls?: string[]): Promise<PublishResult>;
  refreshProfile?(account: SocialAccount): Promise<any>;
  fetchEngagement?(account: SocialAccount, platformPostId: string): Promise<any>;
  fetchComments?(account: SocialAccount, platformPostId: string): Promise<any>;
}
