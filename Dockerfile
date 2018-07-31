FROM node:8.11.3

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install NPMs
COPY package.json* yarn.lock* .npmrc* /usr/src/app/

RUN if [ -f package.json ]; then \
    npm install --production || { echo "\033[0;31mMake sure you have run 'npm login' and have an ~/.npmrc file" && exit 1; }; \
    fi;

COPY . /usr/src/app

ARG CUSTOM_NPM_PACKAGE

# install custom package if given and copy files to "custom"
RUN if ! [ -z $CUSTOM_NPM_PACKAGE ]; then \
    echo "Installing customizations..." && npm install $CUSTOM_NPM_PACKAGE && yes | cp -rf ./node_modules/$CUSTOM_NPM_PACKAGE/* ./custom; \
    fi;

# copy node modules to to level node modules folder
RUN if ! [ -z $CUSTOM_NPM_PACKAGE ]; then \
    echo "Installing custom dependencies..." && mv .npmrc ./custom/.npmrc && cd ./custom && npm i && yes | cp -rf ./node_modules/* ../node_modules && rm .npmrc && cd ..; \
    fi;

RUN rm -f .npmrc

RUN npm run build
CMD [ "npm", "start" ]
