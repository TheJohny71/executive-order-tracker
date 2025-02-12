#!/bin/bash

# Set error handling
set -euo pipefail

# Navigate to project root
cd "$(dirname "$0")"/../../

# Create temp deployment directory
echo "Creating temporary deployment directory..."
rm -rf temp_deploy
mkdir -p temp_deploy

# Copy only necessary files
echo "Copying source files..."
cp package.json package-lock.json temp_deploy/
cp dist/*.js temp_deploy/
cp dist/*.js.map temp_deploy/

# Install production dependencies only
echo "Installing production dependencies..."
cd temp_deploy
npm install --omit=dev --platform=linux --arch=x64

# Remove unnecessary files from node_modules
echo "Optimizing node_modules..."
rm -rf node_modules/puppeteer-core/lib/esm/third_party/chromium
find . -type f -name "*.d.ts" -delete
find . -type f -name "*.map" -delete
find . -type d -name "test" -exec rm -rf {} +
find . -type d -name "tests" -exec rm -rf {} +
find . -type d -name "example" -exec rm -rf {} +
find . -type d -name "examples" -exec rm -rf {} +
find . -type d -name "doc" -exec rm -rf {} +
find . -type d -name "docs" -exec rm -rf {} +

# Create deployment package
echo "Creating deployment package..."
zip -r function.zip . -x "*.git*" "package*.json"

# Get package size
PACKAGE_SIZE=$(ls -l function.zip | awk '{print $5}')
echo "Deployment package size: $((PACKAGE_SIZE/1024/1024))MB"

# Update lambda function
echo "Deploying to Lambda..."
aws lambda update-function-code \
    --function-name executive-order-handler \
    --zip-file fileb://function.zip \
    --region us-east-2

# Clean up
echo "Cleaning up..."
cd ..
rm -rf temp_deploy

echo "Deployment complete!"