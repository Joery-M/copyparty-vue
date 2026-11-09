FROM    node:22-alpine AS build
WORKDIR /src

RUN apk add git

ARG REKA_UI_VERSION
RUN git clone https://github.com/unovue/reka-ui /src/ --depth 1 --single-branch --branch "v${REKA_UI_VERSION}"

RUN npm i -g pnpm@10 && \
    pnpm i --frozen-lockfile

COPY reka-ui.patch /tmp/reka-ui.patch

RUN dos2unix /tmp/reka-ui.patch && git apply /tmp/reka-ui.patch
RUN cat /src/packages/core/src/internal.ts

RUN pnpm run --filter reka-ui build
WORKDIR /src/packages/core
RUN npm pack && mv ./reka-ui-${REKA_UI_VERSION}.tgz /tmp/reka-ui.tgz
RUN rm -rf ./node_modules/

FROM node:22-alpine

COPY --from=build /tmp/reka-ui.tgz /tmp/

CMD ["/bin/cp", "/tmp/reka-ui.tgz", "/output/"]