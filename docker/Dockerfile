# Stage 1: Build/Minification (Optional but professional)
FROM alpine:3.19 AS builder
WORKDIR /app
COPY site/ .
# In a larger project, you'd run npm install/build here. 
# For static HTML, we just ensure the files are ready.

# Stage 2: Production Environment
FROM nginx:1.25-alpine

# 1. Security: Create a non-root user to run NGINX
# We use the existing 'nginx' user but ensure permissions are correct
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# 2. Optimization: Copy only the necessary files
COPY --from=builder /app /usr/share/nginx/html

# 3. Configuration: Add a custom NGINX config
# We'll create this file next to handle the non-root port (8080)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 4. Permissions: Ensure the nginx user can read the static files
RUN chown -R nginx:nginx /usr/share/nginx/html

# 5. Switch to the non-root user
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]