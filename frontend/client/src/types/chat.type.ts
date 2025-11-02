export type ChatMessage = {
    _id: string;
    chatId: string;
    senderId: string;
    type?: "text" | "image" | "ai";
    text?: string;
    imageUrls?: string[]; // S3 keys for images
    createdAt?: string;
  
    // client-side helpers
    pending?: boolean;
    clientId?: string;   // used to match optimistic -> server echo
  };
  