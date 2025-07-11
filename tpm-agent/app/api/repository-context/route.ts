import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { logger } from "@/app/lib/logger";

// 2025-03-01-preview is the min version with responses API support
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-03-01-preview";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

const aoaiClient = endpoint && apiKey ? new AzureOpenAI({ 
  endpoint,  
  apiKey,
  deployment, 
  apiVersion,
}) : null;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'GitHub authentication required' },
        { status: 401 }
      );
    }

    if (!aoaiClient) {
      return NextResponse.json(
        { error: 'Azure OpenAI client not configured. Check environment variables.' },
        { status: 500 }
      );
    }

    const { repositoryContext, previousResponseId }: { 
      repositoryContext: {
        id: number;
        name: string;
        full_name: string;
        description: string | null;
        private: boolean;
        html_url: string;
        language: string | null;
      },
      previousResponseId?: string
    } = await request.json();

    if (!repositoryContext) {
      return NextResponse.json(
        { error: 'Repository context is required' },
        { status: 400 }
      );
    }

    const developerMessage = {
      role: 'developer',
      content: `Active repository has been set to: ${repositoryContext.full_name}

Repository Details:
- Name: ${repositoryContext.name}
- Full Name: ${repositoryContext.full_name}
- Description: ${repositoryContext.description || 'No description available'}
- Private: ${repositoryContext.private ? 'Yes' : 'No'}
- Primary Language: ${repositoryContext.language || 'Not specified'}
- URL: ${repositoryContext.html_url}

This repository is now the active context for all subsequent project management tasks, issue creation, and development planning.`
    };

    const responseCreateParams: any = {
      model: deployment,
      input: [developerMessage],
      stream: false,
    };

    // Add previous response ID for conversation continuity
    if (previousResponseId) {
      responseCreateParams.previous_response_id = previousResponseId;
    }

    // Always add remote MCP server configuration for GitHub integration
    if (session?.accessToken) {
      responseCreateParams.tools = [{
        type: "mcp",
        server_label: "github_remote_mcp",
        server_url: "https://api.githubcopilot.com/mcp/",
        require_approval: "never",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      }];
    }

    const response = await aoaiClient.responses.create(responseCreateParams);

    return NextResponse.json({ 
      success: true, 
      responseId: response.id,
      message: 'Repository context updated successfully' 
    });

  } catch (error) {
    logger.error('Repository context update error:', error);
    
    return NextResponse.json(
      { error: `Failed to update repository context: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
