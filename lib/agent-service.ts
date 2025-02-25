import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BaseMessageChunk } from "langchain/schema";

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const systemMessage = new SystemMessage(
  "You are a knowledgeable expert on the Nigerian Constitution. Provide accurate, helpful advice while citing relevant sections of the constitution or legal precedents. Be concise but thorough."
);

export async function getAgentResponse(message: string): Promise<string> {
  try {
    const response = await model.invoke([
      systemMessage,
      new HumanMessage(message)
    ]);
    
    // Ensure we return a string
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content.map(c => 
        typeof c === 'string' ? c : JSON.stringify(c)
      ).join(' ');
    }
    return String(response.content);
  } catch (error) {
    console.error('Error in agent:', error);
    return "I apologize, but I'm having trouble processing your request right now.";
  }
}

// Add this function to generate titles
export async function generateTitle(message: string): Promise<string> {
  const titleModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  const titleSystemMessage = new SystemMessage(
    "You are a concise title generator. Create a short, descriptive title (max 40 characters) based on the user's first message. Focus on the main topic or question."
  );

  try {
    const response = await titleModel.invoke([
      titleSystemMessage,
      new HumanMessage(`Generate a title for this chat: "${message}"`),
    ]);
    
    return response.content as string;
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
} 