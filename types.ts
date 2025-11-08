export interface StoryPage {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}
