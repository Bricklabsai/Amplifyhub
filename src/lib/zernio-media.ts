import { promises as fs } from "node:fs";
import path from "node:path";
import { getAppBaseUrl, getZernioClient } from "./zernio";

/**
 * Zernio MediaItem `type` values it accepts when creating a post.
 */
export type ZernioMediaKind = "image" | "video" | "gif" | "document";

/**
 * Mapping from file extension → Zernio-supported MIME type. Keep in sync
 * with the contentType enum in `media.getMediaPresignedUrl`.
 */
const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
};

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg)(\?|$)/i;
const GIF_EXT = /\.gif(\?|$)/i;
const PDF_EXT = /\.pdf(\?|$)/i;

function classify(urlOrPath: string): ZernioMediaKind {
  if (PDF_EXT.test(urlOrPath)) return "document";
  if (GIF_EXT.test(urlOrPath)) return "gif";
  if (VIDEO_EXT.test(urlOrPath) || /\bvideo\b/i.test(urlOrPath))
    return "video";
  return "image";
}

function mimeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Hosts/URLs that Zernio's servers cannot reach (localhost, LAN, etc).
 * Files at these URLs need to be re-uploaded via presigned URL.
 */
function isUnreachableHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0") return true;
  if (host === "127.0.0.1" || host.startsWith("127.")) return true;
  if (host.endsWith(".local")) return true;
  // IPv4 private ranges
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

/**
 * Reads bytes for a URL we control (relative path served from /public, or
 * absolute URL pointing at our own dev server).
 */
async function readLocalBytes(
  inputUrl: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  // Relative URL → look it up under /public
  if (inputUrl.startsWith("/")) {
    const filename = path.basename(inputUrl.split("?")[0]);
    const filePath = path.join(process.cwd(), "public", inputUrl);
    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, filename };
    } catch {
      return null;
    }
  }

  // Absolute URL on our own host → try filesystem first, fall back to fetch
  if (isAbsoluteHttpUrl(inputUrl)) {
    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      return null;
    }

    const appBase = (() => {
      try {
        return new URL(getAppBaseUrl());
      } catch {
        return null;
      }
    })();

    const sameOrigin = appBase && appBase.host === parsed.host;
    if (sameOrigin && parsed.pathname.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", parsed.pathname);
      try {
        const buffer = await fs.readFile(filePath);
        return { buffer, filename: path.basename(parsed.pathname) };
      } catch {
        // fall through to fetch
      }
    }

    if (isUnreachableHost(parsed)) {
      const res = await fetch(inputUrl);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, filename: path.basename(parsed.pathname) || "media" };
    }
  }

  return null;
}

/**
 * Uploads a local buffer through Zernio's presigned-URL flow. Returns the
 * public URL Zernio will serve the file from.
 */
export async function uploadBufferToZernio(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const zernio = getZernioClient();
  const presign = await zernio.media.getMediaPresignedUrl({
    body: {
      filename,
      // Zernio's enum is strict; cast after we've validated via mimeFor().
      contentType: contentType as Parameters<
        typeof zernio.media.getMediaPresignedUrl
      >[0]["body"]["contentType"],
      size: buffer.byteLength,
    },
  });

  if (presign.error || !presign.data?.uploadUrl || !presign.data?.publicUrl) {
    throw new Error(
      (presign.error as { error?: string } | undefined)?.error ||
        "Zernio refused to issue a presigned URL"
    );
  }

  // `fetch` (undici) wants a BodyInit — wrap the Buffer in a Blob.
  const putRes = await fetch(presign.data.uploadUrl, {
    method: "PUT",
    body: new Blob([new Uint8Array(buffer)], { type: contentType }),
    headers: { "Content-Type": contentType, "Content-Length": String(buffer.byteLength) },
  });

  if (!putRes.ok) {
    throw new Error(
      `Failed to upload media to Zernio (HTTP ${putRes.status})`
    );
  }

  return presign.data.publicUrl;
}

/**
 * Takes whatever URL the caller has on hand (relative `/uploads/...`,
 * `http://localhost`, public CDN URL, etc.) and returns a `{ url, type }`
 * pair safe to drop into `posts.createPost({ body: { mediaItems: [...] } })`.
 *
 * Strategy:
 *   1. Already a public absolute URL → pass through (saves a round-trip).
 *   2. Relative path or local-only URL → upload bytes via presigned URL.
 *   3. Anything we can't resolve → throw, so the publisher reports it
 *      back to the caller as a non-retryable failure.
 */
export async function resolveMediaForZernio(
  inputUrl: string
): Promise<{ url: string; type: ZernioMediaKind }> {
  if (!inputUrl) throw new Error("Empty media URL");

  // Public absolute URLs go straight to Zernio — they can fetch them.
  if (isAbsoluteHttpUrl(inputUrl)) {
    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      throw new Error(`Invalid media URL: ${inputUrl}`);
    }
    if (!isUnreachableHost(parsed)) {
      return { url: inputUrl, type: classify(inputUrl) };
    }
  }

  const local = await readLocalBytes(inputUrl);
  if (!local) {
    throw new Error(`Cannot resolve media URL for Zernio: ${inputUrl}`);
  }

  const contentType = mimeFor(local.filename);
  if (contentType === "application/octet-stream") {
    throw new Error(
      `Unsupported media type for ${local.filename} (no MIME mapping)`
    );
  }

  const publicUrl = await uploadBufferToZernio(
    local.buffer,
    local.filename,
    contentType
  );

  return { url: publicUrl, type: classify(local.filename) };
}
