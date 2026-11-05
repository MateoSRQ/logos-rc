FROM node:22-alpine

WORKDIR /app

# Install only the ws dependency required by the WebSocket relay server
RUN npm install ws

# Copy server script
COPY server/ ./server/

ENV NODE_ENV=production
ENV WS_PORT=6322

EXPOSE 6322

USER node

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:6322/health || exit 1

CMD ["node", "server/ws-server.mjs"]
