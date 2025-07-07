import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const credential = new DefaultAzureCredential();
const scope = "https://cognitiveservices.azure.com/.default";
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-11-20";

export const aoaiClient = new AzureOpenAI({ 
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,  
  azureADTokenProvider, 
  deployment, 
  apiVersion,
});
