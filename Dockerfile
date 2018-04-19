FROM node:8 as production
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

FROM production as build
RUN npm install
COPY . .
RUN npm run build

FROM node:8
WORKDIR /app
VOLUME /sqrl
COPY --from=production /app /app
COPY --from=build /app/lib /app/lib
RUN ln -s /app/lib/cli.js /usr/local/bin/sqrl

EXPOSE 2288
CMD [ "sqrl" ]
