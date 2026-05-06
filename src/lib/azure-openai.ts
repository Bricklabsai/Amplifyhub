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
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const imageDeployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT;

  if (!apiKey) {
    throw new Error("AZURE_OPENAI_API_KEY is not configured");
  }

  if (!imageDeployment) {
    throw new Error("AZURE_OPENAI_IMAGE_DEPLOYMENT is not configured");
  }

  // Get base URL from resource name
  
  const resourceUrl = process.env.AZURE_OPENAI_RESOURCE_URL 

  return {
    apiKey,
    imageDeployment,
    resourceUrl,
    apiVersion: "2024-02-01",
  };
}
