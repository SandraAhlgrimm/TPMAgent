// import { NextRequest, NextResponse } from "next/server";
// import { AzureOpenAI } from "openai";

// const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
// const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-11-20";
// const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
// const apiKey = process.env.AZURE_OPENAI_API_KEY;

// // Validate required environment variables
// if (!endpoint) {
//   console.error('AZURE_OPENAI_ENDPOINT environment variable is required but not set');
// }

// if (!apiKey) {
//   console.error('AZURE_OPENAI_API_KEY environment variable is required but not set');
// }

// const aoaiClient = endpoint && apiKey ? new AzureOpenAI({ 
//   endpoint,  
//   apiKey,
//   deployment, 
//   apiVersion,
// }) : null;

// interface Message {
//   role: 'user' | 'assistant';
//   content: string;
// }

// export async function POST(request: NextRequest) {
//   try {
//     if (!aoaiClient) {
//       return NextResponse.json(
//         { error: 'Azure OpenAI client not configured. Check environment variables.' },
//         { status: 500 }
//       );
//     }

//     const { messages }: { messages: Message[] } = await request.json();

//     if (!messages || !Array.isArray(messages)) {
//       return NextResponse.json(
//         { error: 'Messages array is required' },
//         { status: 400 }
//       );
//     }

//     console.log('Starting chat completion stream with messages:', messages);

//     const stream = await aoaiClient.chat.completions.create({
//       model: deployment,
//       messages: messages.map(msg => ({
//         role: msg.role,
//         content: msg.content
//       })),
//       stream: true,
//       max_tokens: 1000,
//       temperature: 0.7,
//     });

//     // Create a ReadableStream for streaming the response
//     const encoder = new TextEncoder();
//     const readable = new ReadableStream({
//       async start(controller) {
//         try {
//           for await (const chunk of stream) {
//             const content = chunk.choices[0]?.delta?.content || '';
//             if (content) {
//               console.log('Sending chunk:', content);
//               controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
//             }
//           }
//           controller.enqueue(encoder.encode('data: [DONE]\n\n'));
//           controller.close();
//         } catch (error) {
//           console.error('Stream error:', error);
//           controller.error(error);
//         }
//       }
//     });

//     return new Response(readable, {
//       headers: {
//         'Content-Type': 'text/event-stream',
//         'Cache-Control': 'no-cache',
//         'Connection': 'keep-alive',
//       },
//     });

//   } catch (error) {
//     console.error('Azure OpenAI API Error:', error);
    
//     if (error instanceof Error) {
//       if (error.message.includes('401') || error.message.includes('Unauthorized')) {
//         return NextResponse.json(
//           { error: 'Authentication failed. Please check your Azure API key.' },
//           { status: 401 }
//         );
//       } else if (error.message.includes('404')) {
//         return NextResponse.json(
//           { error: 'Azure OpenAI endpoint or deployment not found. Please check your configuration.' },
//           { status: 404 }
//         );
//       } else if (error.message.includes('429')) {
//         return NextResponse.json(
//           { error: 'Rate limit exceeded. Please try again later.' },
//           { status: 429 }
//         );
//       }
//     }
    
//     return NextResponse.json(
//       { error: `Failed to get response from Azure OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}` },
//       { status: 500 }
//     );
//   }
// }
