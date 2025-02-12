#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")"/../../

# Create temp deployment directory
mkdir -p temp_deploy

# Copy only necessary files
cp -r deploy/index.js deploy/index.js.map deploy/types.js deploy/types.js.map temp_deploy/
cp package.json temp_deploy/

# Install production dependencies in temp directory
cd temp_deploy
npm install --omit=dev

# Create deployment package
zip -r function.zip .

# Update lambda function
aws lambda update-function-code --function-name executive-order-handler --zip-file fileb://function.zip --region us-east-2

# Clean up
cd ..
rm -rf temp_deploy
