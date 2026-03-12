# Stage 1: Build the React Application
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# We use the build script defined in package.json (Vite)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the build output from the previous stage to Nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port (default for Nginx is 80)
EXPOSE 80
# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
