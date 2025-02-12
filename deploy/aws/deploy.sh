#!/bin/bash

cd "$(dirname "$0")/../..
cd deploy
rm -rf node_modules
npm install --production
zip -r function.zip .
aws lambda update-function-code --function-name executive-order-handler --zip-file fileb://function.zip --region us-east-2
rm function.zip
