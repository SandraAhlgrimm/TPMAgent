import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { EasyInputMessage } from "openai/resources/responses/responses.mjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { logger } from "@/app/lib/logger";

// 2025-03-01-preview is the min version with responses API support
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-03-01-preview";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

// Validate required environment variables
if (!endpoint) {
  logger.error('AZURE_OPENAI_ENDPOINT environment variable is required but not set');
}

if (!apiKey) {
  logger.error('AZURE_OPENAI_API_KEY environment variable is required but not set');
}

const aoaiClient = endpoint && apiKey ? new AzureOpenAI({ 
  endpoint,  
  apiKey,
  deployment, 
  apiVersion,
}) : null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

    const { message, previousResponseId }: { message: string, previousResponseId?: string } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const streamConfig: any = {
      model: deployment,
      input: [{ role: 'user', content: message }],
      stream: true,
    };

    // Add previous response ID for conversation continuity
    if (previousResponseId) {
      streamConfig.previous_response_id = previousResponseId;
    }

    // Always add remote MCP server configuration for GitHub integration
    if (session?.accessToken) {
      streamConfig.tools = [{
        type: "mcp",
        server_label: "github_remote_mcp",
        server_url: "https://api.githubcopilot.com/mcp/",
        require_approval: "never",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      }];
    }

    const stream = await aoaiClient.responses.create(streamConfig);

    // Create a ReadableStream for streaming the response
    const encoder = new TextEncoder();
    let responseId: string | null = null;
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const asyncIterable = stream as any;
          for await (const chunk of asyncIterable) {
            // Send response ID when we first get it
            if (chunk.response?.id && !responseId) {
              responseId = chunk.response.id;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'response_id', 
                id: responseId 
              })}\n\n`));
            }
            
            // Handle text deltas
            if (chunk.type === 'response.output_text.delta' && chunk.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'content',
                content: chunk.delta
              })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          logger.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('Azure OpenAI API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your Azure API key.' },
          { status: 401 }
        );
      } else if (error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Azure OpenAI endpoint or deployment not found. Please check your configuration.' },
          { status: 404 }
        );
      } else if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `Failed to get response from Azure OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
