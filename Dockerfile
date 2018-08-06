FROM node:8.11.3

# Environment variables
ENV GOOGLE_CLIENT_ID /
ENV GOOGLE_CLIENT_SECRET /
ENV SESSION_SECRET /
ENV APPROVED_DOMAINS /

ENV DRIVE_TYPE /team
ENV DRIVE_ID /

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install NMs
COPY package.json* package-lock.json* /usr/src/app/
RUN npm i --production

COPY . /usr/src/app
RUN npm run build
