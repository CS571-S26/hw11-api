FROM node:22
WORKDIR /usr/src/app

RUN mkdir /cs571

ENV SEMESTER=s26
ENV PRODUCT=hw11-chat
ENV ENV_NAME=prod
ENV PORT=58112
ENV CS571_PUBLIC_CONFIG_PATH=/cs571/config.prod.public
ENV CS571_PRIVATE_CONFIG_PATH=/cs571/config.prod.secret

COPY LICENSE LICENSE
COPY tsconfig.json tsconfig.json
COPY .eslintrc.json .eslintrc.json
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install

COPY src/. src/.
COPY includes/. includes/.
RUN npm run build

EXPOSE 58112
CMD [ "npm", "start" ]