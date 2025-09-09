#############################
# BUILD FOR LOCAL DEVELOPMENT
#############################
# Use Node.js LTS version
FROM node:22.18.0-alpine3.21 AS development

# Install Tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /usr/src/app

# Copy only necessary files and directories
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY custom-typings.d.ts ./
COPY typeorm.config.ts ./
COPY typeorm.config-migrations.ts ./
COPY src/ src/

# Set NODE_ENV environment variable
ENV NODE_ENV development

# Install dependencies
RUN npm ci

# Use Tini to handle PID 1 and start the application
ENTRYPOINT ["/sbin/tini", "--"]

# Command to run the application
CMD ["npm", "run", "start:dev"]

#########################
# BUILD FOR LOCAL TESTING
#########################
# Use Node.js LTS version
FROM node:22.18.0-alpine3.21 AS test

# Install Tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /usr/src/app

# Set proper ownership for the files and directories
RUN chown -R node:node /usr/src/app

# Switch to the node user
USER node

# Copy only necessary files and directories
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node custom-typings.d.ts ./
COPY --chown=node:node typeorm.config.ts ./
COPY --chown=node:node typeorm.config-migrations.ts ./
COPY --chown=node:node src/ src/

# Install ALL dependencies first (including devDependencies for types)
RUN npm ci --include=dev

# Set NODE_ENV environment variable
ENV NODE_ENV development

# Compile TypeScript
RUN npm run build

# # Remove devDependencies
RUN npm prune --omit=dev

# Clean npm cache and clean up
RUN npm cache clean --force
RUN rm -rf src
RUN rm -rf tsconfig.json nest-cli.json custom-typings.d.ts typeorm.config.ts typeorm.config-migrations.ts

# Use Tini to handle PID 1 and start the application
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/src/main"]

######################
# BUILD FOR PRODUCTION
######################
# Use Node.js LTS version
FROM node:22.18.0-alpine3.21 AS production

# Install Tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /usr/src/app

# Set proper ownership for the files and directories
RUN chown -R node:node /usr/src/app

# Switch to the node user
USER node

# Copy only necessary files and directories
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node custom-typings.d.ts ./
COPY --chown=node:node typeorm.config.ts ./
COPY --chown=node:node typeorm.config-migrations.ts ./
COPY --chown=node:node src/ src/

# Install ALL dependencies first (including devDependencies for types)
RUN npm ci --include=dev

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Compile TypeScript
RUN npm run build

# # Remove devDependencies
RUN npm prune --omit=dev

# Clean npm cache and clean up
RUN npm cache clean --force
RUN rm -rf src
RUN rm -rf tsconfig.json nest-cli.json custom-typings.d.ts typeorm.config.ts typeorm.config-migrations.ts

# Use Tini to handle PID 1 and start the application
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/src/main"]
