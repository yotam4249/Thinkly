export type ChatMessage = {
    _id: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt?: string;
  
    // client-side helpers
    pending?: boolean;
    clientId?: string;   // used to match optimistic -> server echo
  };
  