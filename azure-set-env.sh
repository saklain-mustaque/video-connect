#!/bin/bash

# Azure Environment Variables Setup Script
# Run this to set environment variables in Azure App Service

# Replace these values with your actual Azure details
RESOURCE_GROUP="your-resource-group-name"
APP_NAME="video-server"

echo "Setting environment variables for Azure App Service..."

# Set all required environment variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    NODE_ENV="production" \
    SESSION_SECRET="video-conference-super-secret-key-change-in-production" \
    COOKIE_DOMAIN=".farooqfarrukh.rest" \
    MONGODB_URI="mongodb+srv://sak:saklain1@videomodule.psihika.mongodb.net/" \
    LIVEKIT_URL="wss://video-conferencing-module-h3ydok2l.livekit.cloud" \
    LIVEKIT_API_KEY="APICW8Se679eafG" \
    LIVEKIT_API_SECRET="pIvugkaf3SdzTvy206sJdQzhUcjcq7sHvzPDw7nPoKc" \
    WEBSITES_PORT="5000" \
    PORT="5000"

echo "✅ Environment variables set successfully!"
echo "Restarting app service..."

# Restart the app service
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME

echo "✅ App service restarted!"
