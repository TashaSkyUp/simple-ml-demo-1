#!/bin/bash

# CNN Trainer Deployment Script
# Automated deployment to Google Cloud for minimal cost

set -e  # Exit on any error

echo "🚀 CNN Trainer - Automated Google Cloud Deployment"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    case $1 in
        "pass") echo -e "${GREEN}✅ $2${NC}" ;;
        "warn") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "fail") echo -e "${RED}❌ $2${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $2${NC}" ;;
    esac
}

# Configuration
PROJECT_NAME="cnn-trainer-$(date +%s)"
REGION="us-central1"
DEPLOY_METHOD="cloud-run"  # Options: cloud-run, storage, app-engine

print_status "info" "Starting deployment with configuration:"
echo "   Project: $PROJECT_NAME"
echo "   Region: $REGION"
echo "   Method: $DEPLOY_METHOD"
echo ""

# Check prerequisites
print_status "info" "Checking prerequisites..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_status "fail" "Google Cloud CLI not found"
    echo "Please install gcloud CLI:"
    echo "  curl https://sdk.cloud.google.com | bash"
    echo "  exec -l \$SHELL"
    echo "  gcloud init"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_status "warn" "Not authenticated with Google Cloud"
    echo "Please authenticate:"
    echo "  gcloud auth login"
    exit 1
fi

print_status "pass" "Google Cloud CLI ready"

# Check if Node.js project is built
if [ ! -d "dist" ]; then
    print_status "info" "Building project..."
    if [ ! -f "package.json" ]; then
        print_status "fail" "No package.json found. Run from project root directory."
        exit 1
    fi

    npm install
    npm run build

    if [ ! -d "dist" ]; then
        print_status "fail" "Build failed - no dist directory created"
        exit 1
    fi

    print_status "pass" "Project built successfully"
else
    print_status "pass" "Project already built"
fi

# Create Google Cloud project
print_status "info" "Creating Google Cloud project..."
if gcloud projects create $PROJECT_NAME --quiet 2>/dev/null; then
    print_status "pass" "Project '$PROJECT_NAME' created"
else
    print_status "warn" "Project creation failed (may already exist)"
fi

# Set project
gcloud config set project $PROJECT_NAME
print_status "pass" "Project set to $PROJECT_NAME"

# Check billing account
BILLING_ACCOUNT=$(gcloud billing accounts list --filter="open:true" --format="value(name)" | head -1)
if [ -z "$BILLING_ACCOUNT" ]; then
    print_status "fail" "No active billing account found"
    echo "Please set up billing in Google Cloud Console:"
    echo "  https://console.cloud.google.com/billing"
    exit 1
fi

# Link billing account
gcloud billing projects link $PROJECT_NAME --billing-account=$BILLING_ACCOUNT
print_status "pass" "Billing account linked"

# Enable required APIs
print_status "info" "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable storage-api.googleapis.com --quiet
print_status "pass" "APIs enabled"

# Create deployment files
print_status "info" "Creating deployment files..."

# Create Dockerfile
cat > Dockerfile << 'EOF'
# Use the official nginx image for serving static files
FROM nginx:alpine

# Copy built application
COPY dist/ /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create nginx.conf
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
    }
}
EOF

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
.git
.gitignore
README.md
.env*
*.log
.DS_Store
src
public
*.md
*.sh
webgpu-*.html
EOF

# Create app.yaml for App Engine (alternative deployment)
cat > app.yaml << 'EOF'
runtime: nodejs18

handlers:
  - url: /static
    static_dir: dist/static
    secure: always

  - url: /(.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))$
    static_files: dist/\1
    upload: dist/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$
    secure: always

  - url: /.*
    static_files: dist/index.html
    upload: dist/index.html
    secure: always

automatic_scaling:
  min_instances: 0
  max_instances: 1
EOF

print_status "pass" "Deployment files created"

# Deploy based on method
case $DEPLOY_METHOD in
    "cloud-run")
        print_status "info" "Deploying to Cloud Run..."

        # Build and deploy
        gcloud run deploy cnn-trainer \
            --source . \
            --platform managed \
            --region $REGION \
            --allow-unauthenticated \
            --memory 512Mi \
            --cpu 1 \
            --max-instances 1 \
            --quiet

        # Get service URL
        SERVICE_URL=$(gcloud run services describe cnn-trainer --region=$REGION --format="value(status.url)")
        print_status "pass" "Deployed to Cloud Run!"
        echo "   URL: $SERVICE_URL"
        ;;

    "storage")
        print_status "info" "Deploying to Cloud Storage..."

        BUCKET_NAME="${PROJECT_NAME}-cnn-trainer"

        # Create bucket
        gsutil mb -p $PROJECT_NAME -c STANDARD -l $REGION gs://$BUCKET_NAME/

        # Enable website hosting
        gsutil web set -m index.html -e index.html gs://$BUCKET_NAME/

        # Upload files
        gsutil -m cp -r dist/* gs://$BUCKET_NAME/

        # Make public
        gsutil -m acl ch -r -u AllUsers:R gs://$BUCKET_NAME/

        SERVICE_URL="http://$BUCKET_NAME.storage.googleapis.com"
        print_status "pass" "Deployed to Cloud Storage!"
        echo "   URL: $SERVICE_URL"
        ;;

    "app-engine")
        print_status "info" "Deploying to App Engine..."

        # Deploy
        gcloud app deploy app.yaml --quiet --promote

        SERVICE_URL=$(gcloud app describe --format="value(defaultHostname)")
        SERVICE_URL="https://$SERVICE_URL"
        print_status "pass" "Deployed to App Engine!"
        echo "   URL: $SERVICE_URL"
        ;;
esac

# Clean up deployment files
rm -f Dockerfile nginx.conf .dockerignore app.yaml

print_status "pass" "Deployment files cleaned up"

# Display summary
echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📊 Deployment Summary:"
echo "   Project ID: $PROJECT_NAME"
echo "   Method: $DEPLOY_METHOD"
echo "   Region: $REGION"
echo "   URL: $SERVICE_URL"
echo ""
echo "💰 Cost Estimates (monthly):"
case $DEPLOY_METHOD in
    "cloud-run")
        echo "   • ~$0.40/month for light usage"
        echo "   • First 2M requests free"
        echo "   • Scales to zero when not used"
        ;;
    "storage")
        echo "   • ~$0.10/month for storage + bandwidth"
        echo "   • First 5GB free"
        echo "   • No compute costs"
        ;;
    "app-engine")
        echo "   • ~$0.50/month for light usage"
        echo "   • First 28 hours free daily"
        echo "   • Automatic scaling"
        ;;
esac
echo ""
echo "🔧 Management Commands:"
echo "   View logs: gcloud logging read 'resource.type=\"cloud_run_revision\"' --limit 50"
echo "   Update: Re-run this script"
echo "   Delete: gcloud projects delete $PROJECT_NAME"
echo ""
echo "🌟 Your CNN Trainer is now live!"
echo "   Share URL: $SERVICE_URL"
echo ""

# Open browser if possible
if command -v xdg-open &> /dev/null; then
    print_status "info" "Opening deployed app in browser..."
    xdg-open "$SERVICE_URL"
elif command -v open &> /dev/null; then
    print_status "info" "Opening deployed app in browser..."
    open "$SERVICE_URL"
fi

print_status "pass" "Deployment script completed successfully!"
