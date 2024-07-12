# Get the base image
FROM oven/bun:debian

# Working directory
WORKDIR /app

# Copy package.json, package-lock.json and bun.lockb to install dependencies later
COPY package*.json bun.lockb ./

# Install dependencies
RUN bun install --production

# Copy the rest of the files to the working directory
COPY . .

# Expose port 3000
EXPOSE 3000

# Run the application
CMD [ "bun", "run", "start" ]