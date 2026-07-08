# CloudStock

CloudStock is an AWS serverless inventory management application.

## Architecture

<img src="images/archi.png" width="800">

[ Tier 0: Security ] ────► Amazon Cognito User Pool (Issues JWTs upon Manager Sign-in)
                                  │
                                  ▼
 [ Tier 1: Frontend ] ────► React.js + Vite Dashboard (Hosted on Amazon S3)
                                  │
                          (HTTPS Request + Authorization: Bearer <JWT>)
                                  ▼
 [ Tier 2: Gateway ]  ────► Amazon API Gateway (Validates JWT via Cognito Authorizer)
                                  │
                          (Routes traffic to compute)
                                  ▼
 [ Tier 2: Compute ]  ────► AWS Lambda Microservices (Node.js 20 + AWS SDK v3)
                          ├── GetInventory   (ScanCommand)
                          └── UpdateStock    (UpdateCommand + Atomic Counter)
                                  │
                          (SDK Database Queries)
                                  ▼
 [ Tier 3: Data Tier ] ───► Amazon DynamoDB (Partition Key: sku)

