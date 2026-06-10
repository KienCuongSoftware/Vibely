import { Client } from "@stomp/stompjs";
import { isCookieSession } from "../auth/session.js";

function resolveChatWsUrl(token) {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = `${protocol}//${window.location.host}`;
    if (token && !isCookieSession(token)) {
      return `${base}/ws?token=${encodeURIComponent(token)}`;
    }
    return `${base}/ws`;
  }
  return "/ws";
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
