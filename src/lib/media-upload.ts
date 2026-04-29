import { promises as fsPromises } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Download a file from URL to temp storage
 */
export async function downloadMedia(url: string): Promise<{ path: string; type: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download media: ${res.statusText}`);
    
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const ext = getExtensionFromMime(contentType);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(tmpdir(), filename);
    
    // Write buffer to file - using Node.js fs would require 'fs' import
    // For Vercel/edge environments, consider using a different approach
    // This is a simplified version
    await fsPromises.writeFile(filePath, Buffer.from(buffer));
    
    return { path: filePath, type: contentType };
  } catch (error) {
    throw new Error(`Media download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
  };
  return map[mimeType.toLowerCase()] || "";
}

/**
 * Multipart form data helper for file uploads
 */
export function createFormData() {
  const formData = new FormData();
  
  return {
    append(name: string, value: string | Blob, fileName?: string) {
      if (value instanceof Blob) {
        formData.append(name, value, fileName);
      } else {
        formData.append(name, value);
      }
    },
    getFormData: () => formData,
  };
}

/**
 * Upload image to Facebook and return media ID
 */
export async function uploadFacebookImage(
  accessToken: string,
  pageId: string,
  imageUrl: string
): Promise<string> {
  // Option 1: Use URL directly (Facebook can fetch from public URL)
  const res = await fetch(
    `https://graph.facebook.com/v17.0/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        access_token: accessToken,
        published: false, // Upload only, don't publish yet
      }),
    }
  );
  const data = await res.json();
  if (res.ok && data.id) {
    return data.id;
  }
  throw new Error(data.error?.message || "Facebook photo upload failed");
}

/**
 * Upload video to Facebook using chunked upload
 */
export async function uploadFacebookVideo(
  accessToken: string,
  pageId: string,
  videoUrl: string
): Promise<string> {
  const { path: localPath, type } = await downloadMedia(videoUrl);
  const fileBuffer = await fsPromises.readFile(localPath);
  const fileSize = fileBuffer.length;

  try {
    // Step 1: START
    const startRes = await fetch(
      `https://graph.facebook.com/v17.0/${pageId}/videos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "start",
          file_size: fileSize,
          access_token: accessToken,
        }),
      }
    );
    const startData = await startRes.json();
    if (!startRes.ok) throw new Error(startData.error?.message || "FB Video Start failed");

    const uploadSessionId = startData.upload_session_id;

    // Step 2: TRANSFER (simplified: single chunk for now, but using transfer phase)
    // For large videos, this should be looped with chunks
    const formData = new FormData();
    formData.append("upload_phase", "transfer");
    formData.append("start_offset", "0");
    formData.append("upload_session_id", uploadSessionId);
    formData.append("access_token", accessToken);
    formData.append("video_file_chunk", new Blob([fileBuffer]), "video.mp4");

    const transferRes = await fetch(
      `https://graph.facebook.com/v17.0/${pageId}/videos`,
      {
        method: "POST",
        body: formData,
      }
    );
    const transferData = await transferRes.json();
    if (!transferRes.ok) throw new Error(transferData.error?.message || "FB Video Transfer failed");

    // Step 3: FINISH
    const finishRes = await fetch(
      `https://graph.facebook.com/v17.0/${pageId}/videos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "finish",
          upload_session_id: uploadSessionId,
          access_token: accessToken,
        }),
      }
    );
    const finishData = await finishRes.json();
    if (!finishRes.ok) throw new Error(finishData.error?.message || "FB Video Finish failed");

    return finishData.id || startData.video_id; // Some versions return video_id in start
  } finally {
    await cleanupTempFile(localPath);
  }
}

/**
 * Upload image to LinkedIn
 */
export async function uploadLinkedInImage(
  accessToken: string,
  imageUrl: string,
  ownerUrn: string
): Promise<string> {
  // LinkedIn requires 2-step process: register upload -> upload bytes -> create asset
  // Step 1: Register upload
  const registerRes = await fetch(
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          owner: ownerUrn,
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
          supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
        },
      }),
    }
  );

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(registerData.message || "LinkedIn upload registration failed");
  }

  const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  if (!uploadUrl) {
    throw new Error("No upload URL from LinkedIn");
  }

  // Step 2: Download and upload the image bytes
  const { path: localPath } = await downloadMedia(imageUrl);
  const fileBuffer = await fsPromises.readFile(localPath);
  
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg", // Adjust based on actual type
      "Content-Length": fileBuffer.length.toString(),
    },
    body: fileBuffer,
  });

  // Cleanup temp file
  await fsPromises.unlink(localPath);

  if (!uploadRes.ok) {
    throw new Error(`LinkedIn media upload failed: ${uploadRes.statusText}`);
  }

  return registerData.value.asset; // This is the asset URN
}

/**
 * Upload video to TikTok using API v2 with chunked upload
 */
export async function uploadTikTokVideo(
  accessToken: string,
  videoUrl: string,
  title?: string
): Promise<string> {
  const { path: localPath } = await downloadMedia(videoUrl);
  const fileBuffer = await fsPromises.readFile(localPath);
  const fileSize = fileBuffer.length;
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  try {
    // Step 1: Initialize upload
    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: title || "Video from AmplifyHub",
            privacy_level: "PUBLIC_TO_EVERYONE",
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: fileSize,
            chunk_size: CHUNK_SIZE,
            total_chunk_count: totalChunks,
          },
        }),
      }
    );

    const initData = await initRes.json();
    if (!initRes.ok) {
      throw new Error(initData.error?.message || "TikTok upload initialization failed");
    }

    const { upload_url, publish_id } = initData.data;

    // Step 2: Upload the video bytes in chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = fileBuffer.subarray(start, end);

      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Length": chunk.length.toString(),
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
        },
        body: chunk,
      });

      if (!uploadRes.ok) {
        throw new Error(`TikTok video chunk ${i + 1} upload failed: ${uploadRes.statusText}`);
      }
    }

    return publish_id;
  } finally {
    await cleanupTempFile(localPath);
  }
}

/**
 * Upload video to YouTube using resumable upload with chunking
 */
export async function uploadYouTubeVideo(
  accessToken: string,
  videoUrl: string,
  title: string,
  description: string
): Promise<string> {
  const { path: localPath } = await downloadMedia(videoUrl);
  const fileBuffer = await fsPromises.readFile(localPath);
  const fileSize = fileBuffer.length;
  // YouTube chunks must be multiples of 256KB
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  try {
    // Step 1: Initiate resumable upload
    const initiateRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": fileSize.toString(),
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify({
          snippet: {
            title: title || "New Video",
            description: description || "Uploaded via AmplifyHub",
            categoryId: "22", // People & Blogs
          },
          status: {
            privacyStatus: "public",
          },
        }),
      }
    );

    if (!initiateRes.ok) {
      const errorData = await initiateRes.json();
      throw new Error(errorData.error?.message || "YouTube upload initiation failed");
    }

    const uploadUrl = initiateRes.headers.get("Location");
    if (!uploadUrl) throw new Error("No upload URL received from YouTube");

    // Step 2: Upload the video bytes in chunks
    let start = 0;
    while (start < fileSize) {
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = fileBuffer.subarray(start, end);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": chunk.length.toString(),
          "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
        },
        body: chunk,
      });

      if (uploadRes.status === 308) {
        // Resume incomplete - move to next chunk
        start = end;
        continue;
      } else if (uploadRes.ok) {
        const finalData = await uploadRes.json();
        return finalData.id;
      } else {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `YouTube chunk upload failed with status ${uploadRes.status}`);
      }
    }

    throw new Error("YouTube upload completed but no video ID was returned");
  } finally {
    await cleanupTempFile(localPath);
  }
}

/**
 * Clean up temp files
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fsPromises.unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Validate media URL is publicly accessible
 */
export async function validateMediaUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
