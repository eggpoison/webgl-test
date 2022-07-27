import { useCallback, useEffect, useRef, useState } from "react";
import Client from "../client/Client";
import Player from "../entities/Player";

const MAX_CHAT_MESSAGES = 50;

const MAX_CHAR_COUNT = 128;

type ChatMessage = {
   readonly senderName: string;
   readonly message: string;
}

let addChatMessageReference: (senderName: string, message: string) => void;
export function addChatMessage(senderName: string, message: string): void {
   addChatMessageReference(senderName, message);
}

let focusChatboxReference: () => void;
export function focusChatbox(): void {
   focusChatboxReference();
}

let chatboxIsFocusedReference: () => boolean;
export function chatboxIsFocused(): boolean {
   return chatboxIsFocusedReference();
}

const ChatBox = () => {
   const inputBoxRef = useRef<HTMLInputElement | null>(null);
   const [chatMessages, setChatMessages] = useState<Array<ChatMessage>>([]);
   const [isFocused, setIsFocused] = useState<boolean>(false);

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

   const focusChatbox = useCallback((): void => {
      const inputBox = inputBoxRef.current!;
      inputBox.focus();
      setIsFocused(true);
   }, []);

   const closeChatbox = useCallback(() => {
      setIsFocused(false);

      // Reset the chat preview
      inputBoxRef.current!.value = "";
      inputBoxRef.current!.blur();
   }, []);

   const keyPress = (e: KeyboardEvent): void => {
      // Don't type past the max char count
      const chatMessage = inputBoxRef.current!.value;
      if (chatMessage.length >= MAX_CHAR_COUNT) {
         const isAllowed = e.shiftKey || e.metaKey || ["Enter", "Backspace", "Escape", "ArrowRight", "ArrowLeft"].includes(e.key);

         if (!isAllowed) {
            e.preventDefault();
            return;
         }
      }

      const key = e.key;
      switch (key) {
         case "Escape": {
            // Cancel the chat message
            closeChatbox();

            break;
         }
         case "Enter": {
            // Send the chat message
            const chatMessage = inputBoxRef.current!.value;
            if (chatMessage !== "") {
               Client.sendChatMessage(chatMessage);
               addChatMessage(Player.instance.name, chatMessage);
            }

            closeChatbox();

            break;
         }
      }
   }

   useEffect(() => {
      chatboxIsFocusedReference = () => isFocused;
   }, [isFocused]);

   useEffect(() => {
      addChatMessageReference = addChatMessage;
   }, [addChatMessage]);

   useEffect(() => {
      focusChatboxReference = focusChatbox;
   }, [focusChatbox]);

   return (
      <div id="chat-box">
         <div className="message-history">
            {chatMessages.map((message, i) => {
               return <div key={i} className="chat-message">
                  {message.senderName} &gt; {message.message}
               </div>;
            })}
         </div>

         <input ref={inputBoxRef} type="text" onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onKeyDown={e => keyPress(e.nativeEvent as KeyboardEvent)} className={`message-preview${isFocused ? " active" : ""}`} />
      </div>
   );
}

export default ChatBox;