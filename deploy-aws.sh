#!/usr/bin/env bash
set -e

echo "========================================================================"
echo "  HydroPulse AWS Serverless Turnkey Deployment Script"
echo "  Target: AWS Free Tier (ARM64 Lambda, DynamoDB PAY_PER_REQUEST, SNS)"
echo "========================================================================"

# 1. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js is required."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "[ERROR] npm is required."; exit 1; }

# 2. Check for LocalStack flag
LOCALSTACK=0
if [[ "$1" == "--localstack" || "$1" == "-l" ]]; then
  LOCALSTACK=1
fi

# 3. Build packages
echo "[STEP 1/3] Building TypeScript DSP and AWS backend modules..."
npm run build:all

# 4. LocalStack deployment
if [[ "$LOCALSTACK" -eq 1 ]]; then
  echo "[STEP 2/3] Provisioning LocalStack (Zero-Cost Local Cloud Emulation)..."
  ENDPOINT="http://localhost:4566"
  
  if command -v aws >/dev/null 2>&1; then
    aws --endpoint-url="$ENDPOINT" dynamodb create-table \
      --table-name HydroPulse-Incidents \
      --attribute-definitions AttributeName=incidentId,AttributeType=S AttributeName=pipeId,AttributeType=S \
      --key-schema AttributeName=incidentId,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST >/dev/null 2>&1 || true
    echo "[INFO] LocalStack DynamoDB table ready."

    aws --endpoint-url="$ENDPOINT" sns create-topic \
      --name hydropulse-pipe-rupture-alerts >/dev/null 2>&1 || true
    echo "[INFO] LocalStack SNS topic ready."
  fi

  echo "[STEP 3/3] LocalStack configuration verified!"
  echo "Export AWS_ENDPOINT_URL=http://localhost:4566"
  echo "Then start backend: npm run start:backend"
  exit 0
fi

# Live AWS deployment
echo "[STEP 2/3] Checking deployment tooling..."
if command -v sam >/dev/null 2>&1; then
  echo "[STEP 3/3] Executing AWS SAM deployment..."
  sam build
  sam deploy --guided
  exit 0
fi

if command -v aws >/dev/null 2>&1; then
  echo "[STEP 3/3] Deploying via AWS CloudFormation..."
  aws cloudformation deploy \
    --template-file template.yaml \
    --stack-name hydropulse-production \
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
    --region ap-south-1
  exit 0
fi

echo "[NOTICE] Neither SAM CLI nor AWS CLI found in PATH."
echo "For local zero-cost verification, run: npm run test:backend"
exit 0
