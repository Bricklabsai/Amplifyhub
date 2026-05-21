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
  const res = await fetch(
    `https://graph.facebook.com/v17.0/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        access_token: accessToken,
        published: false,
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
  const { path: localPath } = await downloadMedia(videoUrl);
  const fileBuffer = await fsPromises.readFile(localPath);
  const fileSize = fileBuffer.length;

  try {
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

    return finishData.id || startData.video_id;
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
  // Register upload using versioned images API
  const registerRes = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202510",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: ownerUrn,
        },
      }),
    }
  );

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(registerData.message || "LinkedIn image upload initialization failed");
  }

  const uploadUrl = registerData.value.uploadUrl;
  const imageUrn = registerData.value.image;
  
  if (!uploadUrl || !imageUrn) {
    throw new Error("No upload URL or image URN from LinkedIn");
  }

  const { path: localPath } = await downloadMedia(imageUrl);
  const fileBuffer = await fsPromises.readFile(localPath);
  
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": fileBuffer.length.toString(),
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: fileBuffer,
  });

  await fsPromises.unlink(localPath);

  if (!uploadRes.ok) {
    throw new Error(`LinkedIn media upload failed: ${uploadRes.statusText}`);
  }

  return imageUrn;
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
  const CHUNK_SIZE = 10 * 1024 * 1024;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  try {
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
  const CHUNK_SIZE = 5 * 1024 * 1024;

  try {
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
            categoryId: "22",
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
