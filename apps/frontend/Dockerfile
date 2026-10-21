# Stage 1: Build the Next.js application
FROM node:26.9-alpine AS builder

WORKDIR /usr/app

ENV NODE_ENV=production
ENV HUSKY=0

# Optional public CA bundle explicitly supplied for inspected networks.
ARG VM_CA_SHA256=none
RUN --mount=type=secret,id=vm_ca \
    if [ -s /run/secrets/vm_ca ]; then cat /run/secrets/vm_ca >> /etc/ssl/cert.pem; fi
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem

COPY package.json .
COPY yarn.lock .
COPY .yarnrc.yml .
COPY .yarn/releases ./.yarn/releases
COPY .yarn/patches ./.yarn/patches

# Install dependencies
RUN node .yarn/releases/yarn-4.16.0.cjs --version && node .yarn/releases/yarn-4.16.0.cjs install --immutable

COPY . .

RUN node .yarn/releases/yarn-4.16.0.cjs run test

RUN node .yarn/releases/yarn-4.16.0.cjs run build

CMD ["node", ".yarn/releases/yarn-4.16.0.cjs", "run", "start"]