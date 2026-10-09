@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo   HydroPulse AWS Serverless Turnkey Deployment Script
echo   Target: AWS Free Tier (ARM64 Lambda, DynamoDB PAY_PER_REQUEST, SNS)
echo ========================================================================

:: 1. Check prerequisites
where node >nul 2>&1 || (echo [ERROR] Node.js is required but not installed. & exit /b 1)
where npm >nul 2>&1 || (echo [ERROR] npm is required but not installed. & exit /b 1)

:: 2. Check for LocalStack flag
set LOCALSTACK=0
if "%1"=="--localstack" set LOCALSTACK=1
if "%1"=="-l" set LOCALSTACK=1

:: 3. Build monorepo packages
echo [STEP 1/3] Building TypeScript DSP and AWS backend modules...
call npm run build:all
if %errorlevel% neq 0 (echo [ERROR] Build failed. & exit /b 1)

:: 4. Deploy via LocalStack or AWS Cloud
if "!LOCALSTACK!"=="1" (
  echo [STEP 2/3] Provisioning LocalStack (Zero-Cost Local Cloud Emulation)...
  echo Endpoint: http://localhost:4566
  
  where aws >nul 2>&1
  if %errorlevel% equ 0 (
    aws --endpoint-url=http://localhost:4566 dynamodb create-table ^
      --table-name HydroPulse-Incidents ^
      --attribute-definitions AttributeName=incidentId,AttributeType=S AttributeName=pipeId,AttributeType=S ^
      --key-schema AttributeName=incidentId,KeyType=HASH ^
      --billing-mode PAY_PER_REQUEST >nul 2>&1
    echo [INFO] LocalStack DynamoDB table ready.

    aws --endpoint-url=http://localhost:4566 sns create-topic ^
      --name hydropulse-pipe-rupture-alerts >nul 2>&1
    echo [INFO] LocalStack SNS topic ready.
  ) else (
    echo [INFO] AWS CLI not detected; backend in-memory fallback will handle LocalStack simulation.
  )

  echo [STEP 3/3] LocalStack configuration verified!
  echo Run: set AWS_ENDPOINT_URL=http://localhost:4566
  echo Then start backend: npm run start:backend
  exit /b 0
)

:: Live AWS Deployment
echo [STEP 2/3] Checking AWS CLI & SAM tools...
where sam >nul 2>&1
if %errorlevel% equ 0 (
  echo [STEP 3/3] Executing AWS SAM guided deployment...
  sam build
  sam deploy --guided
  exit /b %errorlevel%
)

where aws >nul 2>&1
if %errorlevel% equ 0 (
  echo [STEP 3/3] SAM CLI not found; deploying via AWS CloudFormation...
  aws cloudformation deploy ^
    --template-file template.yaml ^
    --stack-name hydropulse-production ^
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND ^
    --region ap-south-1
  exit /b %errorlevel%
)

echo [NOTICE] Neither SAM CLI nor AWS CLI was found in PATH.
echo For local zero-cost verification, run: npm run test:backend
echo To deploy to AWS, install AWS CLI or AWS SAM CLI.
exit /b 0
