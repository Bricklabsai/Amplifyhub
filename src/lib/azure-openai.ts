import { AzureOpenAI } from "openai";

/**
 * Initialize Azure OpenAI client for chat/text generation
 */
export function getAzureOpenAIClient() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiUrl = process.env.AZURE_OPENAI_URL;

  if (!apiKey || !apiUrl) {
    throw new Error("Azure OpenAI credentials are not configured");
  }

  // Extract endpoint from full URL
  const url = new URL(apiUrl);
  const endpoint = `${url.protocol}//${url.host}`;
  
  // Extract deployment name from URL path
  // URL format: https://resource.cognitiveservices.azure.com/openai/deployments/deployment-name/chat/completions?api-version=...
  const deployment = url.pathname.split("/deployments/")[1]?.split("/")[0] || "gpt-5";
  
  // Extract API version from query params
  const apiVersion = url.searchParams.get("api-version") || "2025-01-01-preview";

  return new AzureOpenAI({
    apiKey,
    endpoint,
    apiVersion,
    deployment,
  });
}

/**
 * Get Azure endpoint and API key for direct API calls (image generation/editing)
 */
export function getAzureImageAPIConfig() {
  const apiKey =
    process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_API_KEY;
  const imageDeployment =
    process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || "gpt-image-2";

  if (!apiKey) {
    throw new Error(
      "AZURE_OPENAI_API_KEY (or AZURE_API_KEY) is not configured"
    );
  }

  let resourceUrl = process.env.AZURE_OPENAI_RESOURCE_URL?.replace(/\/$/, "");

  if (!resourceUrl && process.env.AZURE_IMAGE_URL) {
    const parsed = new URL(process.env.AZURE_IMAGE_URL);
    resourceUrl = `${parsed.protocol}//${parsed.host}`;
  }

  if (!resourceUrl && process.env.AZURE_OPENAI_URL) {
    const parsed = new URL(process.env.AZURE_OPENAI_URL);
    resourceUrl = `${parsed.protocol}//${parsed.host}`;
  }

  if (!resourceUrl) {
    throw new Error(
      "AZURE_OPENAI_RESOURCE_URL is not configured (e.g. https://your-resource.cognitiveservices.azure.com)"
    );
  }

  return {
    apiKey,
    imageDeployment,
    resourceUrl,
    apiVersion: process.env.AZURE_IMAGE_API_VERSION || "2024-02-01",
  };
}

/** Append a multipart file the way Azure OpenAI image edits expects (@image, @mask). */
export async function appendFileToMultipartForm(
  form: FormData,
  fieldName: string,
  file: File
): Promise<void> {
  const bytes = await file.arrayBuffer();
  const mime = file.type || "image/png";
  const blob = new Blob([bytes], { type: mime });
  const name =
    file.name && /\.(png|jpe?g|webp)$/i.test(file.name)
      ? file.name
      : `${fieldName}.png`;
  form.append(fieldName, blob, name);
}
