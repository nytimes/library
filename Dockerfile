FROM node:8.1.0

ARG NPM_TOKEN

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN test -e /usr/src/app/.npmrc || echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > /usr/src/app/.npmrc

COPY package.json yarn.lock /usr/src/app/

RUN yarn install

COPY . /usr/src/app
RUN npm run build

CMD [ "npm", "start" ]
