FROM node:20-alpine

RUN mkdir -p /app && chown -R 1000:1000 /app
WORKDIR /app

USER 1000

COPY --chown=1000:1000 package*.json ./
RUN npm install

COPY --chown=1000:1000 . .

EXPOSE 4000

RUN npx prisma generate

CMD ["npm", "run", "start:dev"]