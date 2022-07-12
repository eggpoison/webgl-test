import { useCallback, useEffect, useState } from "react";

const MAX_CHAT_MESSAGES = 50;

type ChatMessage = {
   readonly senderName: string;
   readonly message: string;
}

let addChatMessageReference: (senderName: string, message: string) => void;
export function addChatMessage(senderName: string, message: string): void {
   addChatMessageReference(senderName, message);
}

let setChatMessagePreviewReference: (message: string | null) => void;
export function setChatMessagePreview(message: string | null): void {
   setChatMessagePreviewReference(message);
}

const ChatBox = () => {
   const [chatMessages, setChatMessages] = useState<Array<ChatMessage>>([]);
   const [messagePreview, setMessagePreview] = useState<string | null>(null);

   const addChatMessage = useCallback((senderName: string, message: string): void => {
      const newChatMessages = chatMessages.slice();

      newChatMessages.push({
         senderName: senderName,
         message: message
      });

      // Remove a chat message if the number of messages has exceeded the maximum
      if (newChatMessages.length > MAX_CHAT_MESSAGES) {
         newChatMessages.splice(0, 1);
      }

      setChatMessages(newChatMessages);
   }, [chatMessages]);

   const setChatMessagePreview = useCallback((message: string | null): void => {
      setMessagePreview(message);
   }, []);

   useEffect(() => {
      setChatMessagePreviewReference = setChatMessagePreview;
   }, [setChatMessagePreview]);

   useEffect(() => {
      addChatMessageReference = addChatMessage;
   }, [addChatMessage]);

   return (
      <div id="chat-box">
         <div className="message-history">
            {chatMessages.map((message, i) => {
               return <div key={i} className="chat-message">
                  {message.senderName} &gt; {message.message}
               </div>;
            })}
         </div>

         <div className="message-preview">
            <div className="chat-message">
               {messagePreview}
            </div>
         </div>
      </div>
   );
}

export default ChatBox;