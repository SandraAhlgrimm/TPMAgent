import { NextRequest, NextResponse } from "next/server";
import { AgentsClient, RunStreamEvent, MessageStreamEvent, DoneEvent, ErrorEvent, isOutputOfType, ToolUtility } from "@azure/ai-agents";
import { DefaultAzureCredential } from "@azure/identity";
import type { MessageDeltaChunk, MessageDeltaTextContent, MessageTextContent, ThreadRun } from "@azure/ai-agents";

const modelDeploymentName = process.env.MODEL_DEPLOYMENT_NAME || "gpt-4o";
const projectEndpoint = process.env.PROJECT_ENDPOINT;

// Validate required environment variables
if (!projectEndpoint) {
  console.error('PROJECT_ENDPOINT environment variable is required but not set');
}

const client = projectEndpoint ? new AgentsClient(projectEndpoint, new DefaultAzureCredential()) : null;

interface CreateAgentRequest {
  name?: string;
  instructions?: string;
  fileId?: string;
  message?: string;
}

// Create an agent with optional file attachment
export async function createAgent(name: string = "my-agent", instructions: string = "You are a helpful assistant", fileId?: string) {
  if (!client) {
    throw new Error('AgentsClient not initialized. Check PROJECT_ENDPOINT environment variable.');
  }

  try {
    console.log(`Creating agent with name: ${name}`);
    
    const agentConfig: any = {
      name,
      instructions,
      tools: [],
      toolResources: undefined
    };

    // If a file is provided, create code interpreter tool
    if (fileId) {
      const codeInterpreterTool = ToolUtility.createCodeInterpreterTool([fileId]);
      agentConfig.tools = [codeInterpreterTool.definition];
      agentConfig.toolResources = codeInterpreterTool.resources;
    }

    const agent = await client.createAgent(modelDeploymentName, agentConfig);
    console.log(`Created agent, agent ID: ${agent.id}`);
    return agent;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
}

// Create a thread and run a conversation
export async function runConversation(agentId: string, message: string) {
  if (!client) {
    throw new Error('AgentsClient not initialized. Check PROJECT_ENDPOINT environment variable.');
  }

  try {
    // Create a thread
    const thread = await client.threads.create();
    console.log(`Created thread, thread ID: ${thread.id}`);

    // Create a message
    const userMessage = await client.messages.create(thread.id, "user", message);
    console.log(`Created message, message ID: ${userMessage.id}`);

    // Create and execute a run with streaming
    const streamEventMessages = await client.runs.create(thread.id, agentId).stream();
    
    const responses: string[] = [];
    
    for await (const eventMessage of streamEventMessages) {
      switch (eventMessage.event) {
        case RunStreamEvent.ThreadRunCreated:
          console.log(`ThreadRun status: ${(eventMessage.data as ThreadRun).status}`);
          break;
        case MessageStreamEvent.ThreadMessageDelta:
          {
            const messageDelta = eventMessage.data as MessageDeltaChunk;
            messageDelta.delta.content.forEach((contentPart) => {
              if (contentPart.type === "text") {
                const textContent = contentPart as MessageDeltaTextContent;
                const textValue = textContent.text?.value || "";
                if (textValue) {
                  responses.push(textValue);
                }
              }
            });
          }
          break;
        case RunStreamEvent.ThreadRunCompleted:
          console.log("Thread Run Completed");
          break;
        case ErrorEvent.Error:
          console.log(`An error occurred. Data ${eventMessage.data}`);
          break;
        case DoneEvent.Done:
          console.log("Stream completed.");
          break;
      }
    }

    // Get final messages
    const messagesIterator = client.messages.list(thread.id);
    const messagesArray = [];
    for await (const m of messagesIterator) {
      messagesArray.push(m);
    }

    return {
      threadId: thread.id,
      responses: responses.join(''),
      messages: messagesArray
    };
  } catch (error) {
    console.error('Error running conversation:', error);
    throw error;
  }
}

// Upload a file for use with agents
export async function uploadFile(fileStream: NodeJS.ReadableStream, fileName: string) {
  if (!client) {
    throw new Error('AgentsClient not initialized. Check PROJECT_ENDPOINT environment variable.');
  }

  try {
    const file = await client.files.upload(fileStream, "assistants", { fileName });
    console.log(`Uploaded file, file ID: ${file.id}`);
    return file;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Delete an agent
export async function deleteAgent(agentId: string) {
  if (!client) {
    throw new Error('AgentsClient not initialized. Check PROJECT_ENDPOINT environment variable.');
  }

  try {
    await client.deleteAgent(agentId);
    console.log(`Deleted agent, agent ID: ${agentId}`);
  } catch (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }
}

// API Routes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'createAgent':
        const agent = await createAgent(params.name, params.instructions, params.fileId);
        return NextResponse.json({ success: true, agent });

      case 'runConversation':
        if (!params.agentId || !params.message) {
          return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
        }
        const result = await runConversation(params.agentId, params.message);
        return NextResponse.json({ success: true, result });

      case 'deleteAgent':
        if (!params.agentId) {
          return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
        }
        await deleteAgent(params.agentId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  if (!client) {
    return NextResponse.json({ 
      error: 'AgentsClient not initialized. Check PROJECT_ENDPOINT environment variable.' 
    }, { status: 500 });
  }
  
  return NextResponse.json({ 
    status: 'Agents API is ready',
    projectEndpoint,
    modelDeploymentName
  });
}


