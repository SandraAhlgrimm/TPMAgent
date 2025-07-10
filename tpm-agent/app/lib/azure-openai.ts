// Client-side Azure OpenAI integration via API routes

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function* streamResponses(messages: Message[]) {
  try {
    console.info('Starting Responses API route...');
    
    const response = await fetch('/api/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.info('Stream completed successfully');
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                console.debug('Received chunk:', parsed.content);
                yield parsed.content;
              }
            } catch (e) {
              // Ignore parsing errors for partial chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Responses error:', error);
    throw error;
  }
}
