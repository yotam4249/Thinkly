import { Schema, model, Types, Model } from "mongoose";

export type MessageType = "text" | "ai";

export interface IMessage {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: MessageType;
  text?: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId:   { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:     { type: String, enum: ["text", "ai"], required: true },
    text:     { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


MessageSchema.index({ chatId: 1, _id: -1 });

export const MessageModel: Model<IMessage> =
  (model as any).Message || model<IMessage>("Message", MessageSchema);
