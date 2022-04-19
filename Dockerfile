FROM node:16

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install NPMs
COPY package.json* package-lock.json* /usr/src/app/
RUN npm i --production

COPY . /usr/src/app
RUN npm run build
