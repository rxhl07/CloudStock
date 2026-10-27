# ☁️ CloudStock – AWS Cloud Infrastructure Setup Guide

This document contains step-by-step instructions for provisioning all required AWS cloud resources for the **CloudStock** serverless inventory management system.

---

## 📋 Overview of Cloud Services Created
1. **Amazon DynamoDB**: Database table storing stock items (`cloudstock-inventory`).
2. **AWS IAM**: Execution roles and least-privilege policies (`cloudstock-lambda-role`).
3. **Amazon Cognito**: User Pool and App Client for JWT authentication (`cloudstock-user-pool`).
4. **AWS Lambda**: Compute microservices (`cloudstock-get-inventory` & `cloudstock-update-stock`).
5. **Amazon API Gateway**: HTTP API router with JWT authorization and CORS support (`cloudstock-api`).

---

## 🗄️ Step 1: Data Tier (Amazon DynamoDB)

1. Open the **Amazon DynamoDB Console** in your primary region (e.g., `us-east-1`).
2. Click **Create table**.
   * **Table name:** `cloudstock-inventory`
   * **Partition key:** `sku` (Type: **String**)
   * **Table settings:** Select **Default settings** (On-Demand capacity).
3. Click **Create table**.
4. Once active, select `cloudstock-inventory` $\rightarrow$ click **Explore items** $\rightarrow$ **Create item**.
5. Switch to **JSON** view and seed two initial products:

```json
{
  "sku": "SKU-BOOTS-01",
  "itemName": "Waterproof Hiking Boots",
  "quantity": 12,
  "price": 120.00
}
```

```json
{
  "sku": "SKU-TENT-02",
  "itemName": "4-Person Camping Tent",
  "quantity": 3,
  "price": 249.99
}
```

---

## 🛡️ Step 2: Security & Roles (AWS IAM)

### 2.1 Create Custom IAM Policy
1. Open the **IAM Console** $\rightarrow$ **Policies** $\rightarrow$ **Create policy**.
2. Select the **JSON** tab and paste the policy below (replace `YOUR_REGION` and `YOUR_ACCOUNT_ID`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DynamoDBTableAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:Scan",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/cloudstock-inventory"
        },
        {
            "Sid": "CloudWatchLoggingAccess",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```
3. Name the policy **`cloudstock-lambda-dynamo-policy`** and click **Create policy**.

### 2.2 Create Execution Role
1. Go to **IAM Console** $\rightarrow$ **Roles** $\rightarrow$ **Create role**.
2. Select **AWS Service** $\rightarrow$ Use Case: **Lambda**.
3. Search and attach **`cloudstock-lambda-dynamo-policy`**.
4. Name the role **`cloudstock-lambda-role`** and save.

---

## 🔐 Step 3: Auth Tier (Amazon Cognito)

1. Open the **Amazon Cognito Console** $\rightarrow$ Click **Create user pool**.
2. **Define Application / Setup:**
   * **Application type:** Select **Single-page application (SPA)**.
   * **App name:** `cloudstock-react-client`.
   * **Sign-in options:** Select **Email**.
   * **Self-registration:** Enabled.
3. Click **Create user directory**.
4. **Create Manager User:**
   * Open the newly created User Pool (`cloudstock-user-pool`).
   * Go to the **Users** tab $\rightarrow$ click **Create user**.
   * **Email address:** `manager@cloudstock.com`
   * Select **Mark email address as verified**.
   * Click **Create user**.
5. **Set Permanent Password via AWS CloudShell:**
   * Open **AWS CloudShell** `[>_]` in the top header bar.
   * Run the following CLI command to set a permanent password (replace `<YOUR_USER_POOL_ID>`):

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <YOUR_USER_POOL_ID> \
  --username manager@cloudstock.com \
  --password "CloudStock#2026" \
  --permanent
```

> 🔑 **Default Credentials Created:**
> * **Username / Email:** `manager@cloudstock.com`
> * **Password:** `CloudStock#2026`

---

## ⚡ Step 4: Compute Tier (AWS Lambda)

Ensure `get-inventory.zip` and `update-stock.zip` exist inside your `backend/` directory.

### 4.1 Deploy Read Function (`cloudstock-get-inventory`)
1. Open the **Lambda Console** $\rightarrow$ **Create function**.
2. **Function name:** `cloudstock-get-inventory`
3. **Runtime:** `Node.js 20.x`
4. **Execution role:** Select **Use an existing role** $\rightarrow$ `cloudstock-lambda-role`.
5. Click **Create function**.
6. Under **Code source**, click **Upload from** $\rightarrow$ **.zip file** $\rightarrow$ Upload `get-inventory.zip`.

### 4.2 Deploy Write Function (`cloudstock-update-stock`)
1. Click **Create function**.
2. **Function name:** `cloudstock-update-stock`
3. **Runtime:** `Node.js 20.x`
4. **Execution role:** Select `cloudstock-lambda-role`.
5. Click **Create function**.
6. Upload `update-stock.zip`.

---

## 🌐 Step 5: Routing Gateway & Security (Amazon API Gateway)

### 5.1 Create HTTP API & Integrations
1. Open the **API Gateway Console** $\rightarrow$ Click **Build** under **HTTP API**.
2. **API name:** `cloudstock-api`
3. **Add Integrations:**
   * Integration 1: Select **Lambda** $\rightarrow$ `cloudstock-get-inventory`
   * Integration 2: Select **Lambda** $\rightarrow$ `cloudstock-update-stock`
4. **Configure Routes:**
   * `GET` `/inventory` $\rightarrow$ Target: `cloudstock-get-inventory`
   * `POST` `/inventory/update` $\rightarrow$ Target: `cloudstock-update-stock`
5. Click **Next** through stages (keep `$default` auto-deploy enabled) and click **Create**.

### 5.2 Configure CORS
1. In `cloudstock-api`, click **CORS** on the left menu.
2. Click **Configure** and set:
   * **Access-Control-Allow-Origin:** `*`
   * **Access-Control-Allow-Headers:** `content-type`, `authorization`
   * **Access-Control-Allow-Methods:** `GET`, `POST`, `OPTIONS`
3. Click **Save**.

### 5.3 Configure Cognito JWT Authorizer
1. Click **Authorization** on the left menu $\rightarrow$ **Manage authorizers** tab $\rightarrow$ **Create**.
   * **Authorizer type:** `JWT`
   * **Name:** `cloudstock-cognito-authorizer`
   * **Identity source:** `$request.header.Authorization`
   * **Issuer URL:** `https://cognito-idp.<YOUR_REGION>.amazonaws.com/<YOUR_USER_POOL_ID>`
     *(e.g., `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_LRYb6Ink8`)*
   * **Audience:** Enter your **App Client ID**.
2. Click **Create**.
3. Go to the **Attach authorizers to routes** tab:
   * Select **`POST /inventory/update`** $\rightarrow$ attach `cloudstock-cognito-authorizer`.
   * **Important:** Leave `GET /inventory` **unattached** (public for guest viewing).

---

## ⚙️ Step 6: Update Local Environment File (`.env`)

Paste your generated AWS values into `frontend/.env`:

```env
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-app-client-id
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
```

### Launch Local Application:
```bash
cd frontend
npm install
npm run dev
```