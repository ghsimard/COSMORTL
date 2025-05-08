# Deployment Guide for COSMO Project on Render.com

This guide provides detailed instructions for deploying the COSMO Project on Render.com using the Blueprint feature.

## Prerequisites

1. A Render.com account
2. Your GitHub repository connected to Render.com
3. A PostgreSQL database (can be provisioned through Render)

## Deployment Steps

### Method 1: Using Render Blueprint (Recommended)

1. Log in to your Render.com account
2. Go to the Dashboard and click "New +"
3. Select "Blueprint"
4. Connect your GitHub repository if you haven't already
5. Select the COSMORTL repository
6. Render will automatically detect the `render.yaml` file and set up all services
7. Review the configuration and click "Apply"
8. Render will create all services defined in the blueprint

### Method 2: Manual Setup

If you prefer to set up services manually:

1. **Set up PostgreSQL Database**:
   - Go to Dashboard > New > PostgreSQL
   - Name: `cosmo-postgres`
   - Select region closest to your users
   - Choose plan (Free is fine for testing)
   - Create Database

2. **Set up Backend Services**:
   For each application (form-docentes, form-acudientes, form-estudiantes, stats-backend):
   - Go to Dashboard > New > Web Service
   - Connect your GitHub repository
   - Select the repository
   - Name: (use appropriate name, e.g., `form-docentes`)
   - Root Directory: (appropriate directory, e.g., `form-docentes`)
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Set Environment Variables:
     - `PORT`: appropriate port (3001, 3005, 3006, 4001)
     - `NODE_ENV`: `production`
     - `DATABASE_URL`: (use the Internal URL from your PostgreSQL service)
   - Create Web Service

3. **Set up Frontend for Stats**:
   - Go to Dashboard > New > Web Service
   - Connect your GitHub repository
   - Name: `stats-frontend`
   - Root Directory: `Stats/frontend`
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run serve`
   - Set Environment Variables:
     - `PORT`: `4000`
     - `NODE_ENV`: `production`
     - `REACT_APP_API_URL`: (URL of your stats-backend service)
   - Create Web Service

4. **Set up Proxy Server**:
   - Go to Dashboard > New > Web Service
   - Connect your GitHub repository
   - Name: `cosmo-proxy`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node proxy-server.js`
   - Set Environment Variables:
     - `PORT`: `10000` (Render assigns a port automatically)
     - `NODE_ENV`: `production`
     - `DOCENTES_URL`: (URL of your form-docentes service)
     - `ACUDIENTES_URL`: (URL of your form-acudientes service)
     - `ESTUDIANTES_URL`: (URL of your form-estudiantes service)
     - `STATS_FRONTEND_URL`: (URL of your stats-frontend service)
     - `STATS_BACKEND_URL`: (URL of your stats-backend service)
     - Optional: Custom tokens
       - `DOCENTES_TOKEN`: (custom token if desired)
       - `ACUDIENTES_TOKEN`: (custom token if desired)
       - `ESTUDIANTES_TOKEN`: (custom token if desired)
       - `STATS_TOKEN`: (custom token if desired)
   - Create Web Service

## Post-Deployment Steps

1. **Check Logs**:
   - After deployment, check the logs for each service to ensure everything is working correctly

2. **Test Access**:
   - Test access to your applications using the appropriate URLs:
     - http://{your-proxy-url}/docentes/{token}
     - http://{your-proxy-url}/acudientes/{token}
     - http://{your-proxy-url}/estudiantes/{token}
     - http://{your-proxy-url}/stats/{token}

3. **Set up Custom Domain** (Optional):
   - In your Render dashboard, go to the proxy service
   - Click on "Settings" > "Custom Domain"
   - Follow the instructions to set up your custom domain

## Troubleshooting

1. **Service Not Starting**:
   - Check the logs for error messages
   - Verify that all environment variables are set correctly
   - Make sure the build and start commands are correct

2. **Database Connection Issues**:
   - Verify the `DATABASE_URL` environment variable is set correctly
   - Check if the database is accessible from your services
   - Verify that the database schema is up-to-date

3. **Static Assets Not Loading**:
   - Check that the proxy server is correctly routing to the frontend services
   - Verify that the build process completed successfully
   - Check the network tab in your browser's developer tools for errors

4. **Cross-Origin Resource Sharing (CORS) Issues**:
   - Ensure the `CORS_ORIGIN` variable in the stats-backend service is set to the correct frontend URL

## Maintenance and Updates

1. **Updating Your Application**:
   - Push changes to your GitHub repository
   - Render will automatically rebuild and deploy your services (if auto-deploy is enabled)

2. **Monitoring**:
   - Use Render's built-in monitoring to track the performance of your services
   - Set up alerts for critical services

3. **Scaling**:
   - Upgrade your service plans as needed to handle increased traffic
   - Consider adding a CDN for static assets 