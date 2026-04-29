import type { SocialAccount } from "../../../../generated/client";
import type { PlatformPublisher, PublishResult } from "../../../publishers";

export class WhatsAppPublisher implements PlatformPublisher {
  async publish(
    account: SocialAccount,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    try {
      return {
        success: false,
        error: "WhatsApp does not support feed-based posting. Use the dedicated WhatsApp message sender to send messages to contacts/groups.",
        retryable: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryable: true,
      };
    }
  }
}
