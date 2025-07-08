// Client-side integration with Azure AI Agents via API routes

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// https://learn.microsoft.com/en-gb/azure/ai-foundry/agents/how-to/tools/model-context-protocol-samples
// Base on the documenation for the Model Context Protocol (MCP) used by Azure AI Agents, we need to 
// add support to GitHub's official MCP server
export async function createAgent(name?: string, instructions?: string, fileId?: string) {
  try {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createAgent',
        name,
        instructions,
        fileId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.agent;
  } catch (error) {
    console.error('Create agent error:', error);
    throw error;
  }
}

export async function* streamAgentConversation(agentId: string, message: string) {
  try {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'runConversation',
        agentId,
        message
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Since the agent API doesn't stream in real-time like chat completions,
    // we'll simulate streaming by yielding the response in chunks
    const fullResponse = data.result.responses;
    const chunkSize = 10; // characters per chunk
    
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      const chunk = fullResponse.slice(i, i + chunkSize);
      yield chunk;
      // Add a small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
  } catch (error) {
    console.error('Agent conversation error:', error);
    throw error;
  }
}

export async function deleteAgent(agentId: string) {
  try {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteAgent',
        agentId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Delete agent error:', error);
    throw error;
  }
}
