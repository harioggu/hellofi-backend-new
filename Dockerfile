FROM node:20

WORKDIR /usr/src/app


COPY package*.json ./
COPY tsconfig.json ./

RUN npm install -g typescript
RUN npm install


COPY prisma ./prisma/


RUN npx prisma generate


COPY . .


RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]