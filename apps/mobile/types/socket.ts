export interface ServerToClientEvents {
  'message:new': (data: { message: any; conversationId: string }) => void;
  'message:typing': (data: { userId: string; conversationId: string }) => void;
  'message:stop-typing': (data: { userId: string; conversationId: string }) => void;
  'notification:new': (data: { notification: any }) => void;
  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string }) => void;
  'game:state': (data: { state: any; code: string }) => void;
  'game:player-joined': (data: { player: any; code: string }) => void;
  'game:player-left': (data: { playerId: string; code: string }) => void;
  'game:ended': (data: { results: any; code: string }) => void;
  'stream:started': (data: { streamId: string }) => void;
  'stream:ended': (data: { streamId: string }) => void;
}

export interface ClientToServerEvents {
  'conversation:join': (data: { conversationId: string }) => void;
  'conversation:leave': (data: { conversationId: string }) => void;
  'message:send': (data: { conversationId: string; content: string }, callback: (result: any) => void) => void;
  'message:typing': (data: { conversationId: string }) => void;
  'game:create': (data: { gameType: string; settings?: Record<string, unknown> }, callback: (result: any) => void) => void;
  'game:join': (data: { code: string; playerName?: string }, callback: (result: any) => void) => void;
  'game:action': (data: { code: string; action: string; payload?: Record<string, unknown> }, callback: (result: any) => void) => void;
}
