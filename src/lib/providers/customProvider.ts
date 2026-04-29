import type { SocialAccount } from "../../generated/client";
import { 
  type PublishResult, 
  type PlatformPublisher,
  FacebookPublisher,
  TwitterPublisher,
  LinkedInPublisher,
  InstagramPublisher,
  TikTokPublisher,
  YouTubePublisher,
  WhatsAppPublisher,
} from "../publishers";

export class CustomPublisher implements PlatformPublisher {
  private publishers: Record<string, PlatformPublisher>;

  constructor() {
    this.publishers = {
      FACEBOOK: new FacebookPublisher(),
      TWITTER: new TwitterPublisher(),
      INSTAGRAM: new InstagramPublisher(),
      LINKEDIN: new LinkedInPublisher(),
      TIKTOK: new TikTokPublisher(),
      YOUTUBE: new YouTubePublisher(),
      WHATSAPP: new WhatsAppPublisher(),
    };
  }

  async publish(
    account: SocialAccount,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    const publisher = this.publishers[account.platform];
    if (!publisher) {
      return { 
        success: false, 
        error: `No custom publisher for platform: ${account.platform}`, 
        retryable: false 
      };
    }

    return publisher.publish(account, content, mediaUrls);
  }
}
