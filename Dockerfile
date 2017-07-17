FROM node:8.1.0

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install NPMs
COPY package.json* yarn.lock* .npmrc* /usr/src/app/
RUN if [ -f package.json ]; then \
    yarn install || { echo "\033[0;31mMake sure you have run 'npm login' and have an ~/.npmrc file" && exit 1; }; \
    rm -f .npmrc; \
    fi;

COPY . /usr/src/app
RUN npm run build

CMD [ "npm", "start" ]
