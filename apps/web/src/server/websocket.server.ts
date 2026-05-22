import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "../../../modules/core/logger";

interface CursorData {
  userId: string;
  username: string;
  x: number;
  y: number;
  elementId?: string; // which component in the architecture graph they are hovering
}

export class RealTimeCollaboration {
  private io: SocketIOServer | null = null;
  private cursors: Map<string, Map<string, CursorData>> = new Map(); // roomId -> userId -> CursorData

  init(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
      path: "/api/socket.io",
    });

    this.io.on("connection", (socket) => {
      logger.debug({ socketId: socket.id }, "Client connected to real-time sync");

      socket.on("join_room", ({ roomId, user }) => {
        socket.join(roomId);
        if (!this.cursors.has(roomId)) {
          this.cursors.set(roomId, new Map());
        }
        logger.info({ roomId, userId: user.id }, "User joined collaboration room");
      });

      socket.on("cursor_move", ({ roomId, cursor }: { roomId: string, cursor: CursorData }) => {
        const roomCursors = this.cursors.get(roomId);
        if (roomCursors) {
          roomCursors.set(cursor.userId, cursor);
          // Broadcast to everyone else in the room
          socket.to(roomId).emit("cursor_update", Array.from(roomCursors.values()));
        }
      });

      socket.on("disconnect", () => {
        // Cleanup logic would find which rooms this socket was in and remove their cursor
        logger.debug({ socketId: socket.id }, "Client disconnected");
      });
    });

    logger.info("Real-Time Collaboration WebSocket Server initialized.");
  }

  broadcastVerdictUpdate(repoId: string, payload: any) {
    if (this.io) {
      this.io.to(`repo_${repoId}`).emit("verdict_live_update", payload);
    }
  }
}

export const collaboration = new RealTimeCollaboration();
