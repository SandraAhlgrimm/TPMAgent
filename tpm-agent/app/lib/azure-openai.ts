import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const credential = new DefaultAzureCredential();
const scope = "https://cognitiveservices.azure.com/.default";
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4";
const apiVersion = "2024-10-21";

export const azureOpenAIClient = new AzureOpenAI({ 
  azureADTokenProvider, 
  deployment, 
  apiVersion 
});
