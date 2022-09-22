FROM node:16-alpine

RUN mkdir -p /usr/src/app \
  && addgroup -g 1001 library \ 
  && adduser -u 1001 -G library -D library \
  && chown -R 1001:1001 /usr/src/app

USER library
WORKDIR /usr/src/app

# Install NPMs
COPY --chown=1001:1001 entrypoint.sh package.json* package-lock.json* /usr/src/app/
RUN npm install

COPY --chown=1001:1001 . /usr/src/app
RUN npm run build

ENTRYPOINT [ "./entrypoint.sh" ]
