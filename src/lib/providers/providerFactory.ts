import type { PlatformPublisher } from "../publishers";
import { ZernioPublisher } from "./zernioPublisher";
import { CustomPublisher } from "./customProvider";

export function getProvider(): PlatformPublisher {
  const providerType = process.env.POST_PROVIDER || "zernio";

  if (providerType.toLowerCase() === "zernio") {
    return new ZernioPublisher();
  }

  return new CustomPublisher();
}
