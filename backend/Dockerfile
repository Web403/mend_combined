# build stage
FROM node:20 AS builder
WORKDIR /usr/src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# runtime stage
FROM node:20-alpine
WORKDIR /usr/src
COPY --from=builder /usr/src/dist ./dist
COPY package*.json ./
RUN npm ci --production
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "dist/server.js"]