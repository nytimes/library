FROM node:8.1.0

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json yarn.lock /usr/src/app/

RUN yarn install
COPY . /usr/src/app

CMD [ "npm", "start" ]

