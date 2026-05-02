# Use Node image
FROM node:22

# Working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of frontend code
COPY . .

# Expose React port
EXPOSE 5173

# Start React development server
CMD ["npm", "run" , "dev"]
