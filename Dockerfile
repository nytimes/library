FROM node:8.11.3

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install NPMs
COPY package.json* yarn.lock* .npmrc* /usr/src/app/
ARG CUSTOM_NPM_PACKAGE
RUN yarn add $CUSTOM_NPM_PACKAGE

RUN if [ -f package.json ]; then \
    yarn install || { echo "\033[0;31mMake sure you have run 'npm login' and have an ~/.npmrc file" && exit 1; }; \
    fi;



RUN rm -f .npmrc

COPY . /usr/src/app
RUN yes | cp -rf ./node_modules/$CUSTOM_NPM_PACKAGE/* /usr/src/app/custom
RUN npm run build

CMD [ "npm", "start" ]
