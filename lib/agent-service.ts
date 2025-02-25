import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Add this check to ensure the API key exists
// if (!process.env.OPENAI_API_KEY) {
//   throw new Error('Missing OpenAI API Key');
// }

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
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
    
    return response.content as string;
  } catch (error) {
    console.error('Error in agent:', error);
    return "I apologize, but I'm having trouble processing your request right now.";
  }
}

// Add this function to generate titles
export async function generateTitle(message: string): Promise<string> {
  const titleModel = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
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