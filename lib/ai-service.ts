import { getAgentResponse } from './agent-service';

export async function getAIResponse(message: string): Promise<string> {
  try {
    const response = await getAgentResponse(message);
    return response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return "I apologize, but I'm having trouble processing your request right now.";
  }
} 