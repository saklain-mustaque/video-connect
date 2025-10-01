#!/bin/bash

# Azure Deployment Script for Video Conferencing App
# This script handles the complete deployment process

echo "=========================================="
echo "Azure Deployment - Video Conferencing App"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Check if we're in the right directory
echo "Step 1: Checking directory..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi
print_success "In correct directory"
echo ""

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
if npm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi
echo ""

# Step 3: Build the project
echo "Step 3: Building project..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi
echo ""

# Step 4: Check if dist directory exists
if [ ! -d "dist" ]; then
    print_error "dist directory not found after build"
    exit 1
fi
print_success "Build artifacts ready"
echo ""

# Step 5: Git operations
echo "Step 5: Committing changes..."
git add .
if git diff-index --quiet HEAD --; then
    print_warning "No changes to commit"
else
    read -p "Enter commit message (or press Enter for default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Deploy: Add MongoDB session store and fix authentication"
    fi
    
    if git commit -m "$commit_msg"; then
        print_success "Changes committed"
    else
        print_error "Commit failed"
        exit 1
    fi
fi
echo ""

# Step 6: Push to repository
echo "Step 6: Pushing to repository..."
read -p "Push to remote repository? (y/N): " push_confirm
if [[ $push_confirm =~ ^[Yy]$ ]]; then
    if git push; then
        print_success "Pushed to repository"
    else
        print_error "Push failed"
        exit 1
    fi
else
    print_warning "Skipped pushing to repository"
fi
echo ""

# Step 7: Reminder for environment variables
echo "=========================================="
echo "IMPORTANT: Set Environment Variables"
echo "=========================================="
echo ""
echo "Before the app will work, you MUST set these in Azure Portal:"
echo ""
echo "1. Go to: Azure Portal → App Service → Configuration → Application settings"
echo "2. Add these settings:"
echo ""
echo "   NODE_ENV=production"
echo "   SESSION_SECRET=video-conference-super-secret-key-change-in-production"
echo "   COOKIE_DOMAIN=.farooqfarrukh.rest"
echo "   MONGODB_URI=mongodb+srv://sak:saklain1@videomodule.psihika.mongodb.net/"
echo "   LIVEKIT_URL=wss://video-conferencing-module-h3ydok2l.livekit.cloud"
echo "   LIVEKIT_API_KEY=APICW8Se679eafG"
echo "   LIVEKIT_API_SECRET=pIvugkaf3SdzTvy206sJdQzhUcjcq7sHvzPDw7nPoKc"
echo "   PORT=5000"
echo "   WEBSITES_PORT=5000"
echo ""
echo "3. Click Save (app will restart automatically)"
echo ""

# Step 8: Deployment instructions
echo "=========================================="
echo "Azure Server Deployment"
echo "=========================================="
echo ""
echo "On your Azure server, run these commands:"
echo ""
echo "   cd ~/video-connect"
echo "   git pull"
echo "   npm install"
echo "   npm run build"
echo "   # Stop the current server (Ctrl+C)"
echo "   npm start"
echo ""

print_success "Local deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Azure Portal (see above)"
echo "2. SSH into Azure server and run the deployment commands"
echo "3. Verify no MemoryStore warning appears"
echo "4. Test authentication at https://farooqfarrukh.rest"
echo ""
