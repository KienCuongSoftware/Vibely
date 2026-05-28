import { Client } from "@stomp/stompjs";
import { resolveBackendOrigin } from "../config/apiBase.js";

function resolveChatWsUrl(token) {
  const backendOrigin = resolveBackendOrigin();
  const wsBase = backendOrigin.replace(/^http/i, "ws");
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
}

export function createChatSocketClient(token, onMessageEvent) {
  const client = new Client({
    brokerURL: resolveChatWsUrl(token),
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
