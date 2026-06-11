import { Client } from "@stomp/stompjs";
import { resolveWsUrl } from "./wsUrl.js";

export function createChatSocketClient(token, onMessageEvent) {
  const client = new Client({
    brokerURL: resolveWsUrl(token),
    reconnectDelay: 2500,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });

  client.onConnect = () => {
    client.subscribe("/user/queue/chat.messages", (frame) => {
      try {
        const payload = JSON.parse(frame.body);
        onMessageEvent?.(payload);
      } catch {
        /* ignore invalid payload */
      }
    });
  };

  client.onStompError = () => {};
  client.onWebSocketError = () => {};

  return client;
}
