#!/bin/bash

# ===========================================
# 0G DEPLOYMENT SCRIPT
# ===========================================

echo "0G Deployment Script"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
check_railway() {
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
        npm i -g @railway/cli
    fi
}

# Check if Vercel CLI is installed
check_vercel() {
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
        npm i -g vercel
    fi
}

# Deploy backend to Railway
deploy_backend() {
    echo -e "\n${GREEN}📦 Deploying Backend to Railway...${NC}"
    cd apps/server
    
    # Login if needed
    railway login
    
    # Create project or link existing
    if [ ! -f ".railway/project.json" ]; then
        echo "Creating new Railway project..."
        railway init
    fi
    
    # Add PostgreSQL if not exists
    echo "Ensuring PostgreSQL is provisioned..."
    railway add --plugin postgresql || true
    
    # Deploy
    railway up --detach
    
    # Get the deployment URL
    echo -e "${GREEN}✓ Backend deployed!${NC}"
    echo "Run 'railway open' to see your deployment"
    
    cd ../..
}

# Deploy frontend to Vercel
deploy_frontend() {
    echo -e "\n${GREEN}🌐 Deploying Frontend to Vercel...${NC}"
    cd apps/web
    
    # Deploy
    vercel --prod
    
    echo -e "${GREEN}✓ Frontend deployed!${NC}"
    
    cd ../..
}

# Run database migrations
run_migrations() {
    echo -e "\n${GREEN}🗄️ Running database migrations...${NC}"
    cd apps/server
    
    # Get DATABASE_URL from Railway
    export DATABASE_URL=$(railway variables --json | npx json DATABASE_URL 2>/dev/null || echo "")
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}Could not get DATABASE_URL from Railway${NC}"
        echo "Please set DATABASE_URL manually and run: npx prisma migrate deploy"
        return 1
    fi
    
    npx prisma migrate deploy
    npx prisma generate
    
    echo -e "${GREEN}✓ Migrations complete!${NC}"
    cd ../..
}

# Main menu
main() {
    echo ""
    echo "What would you like to deploy?"
    echo "1) Backend (Railway)"
    echo "2) Frontend (Vercel)"
    echo "3) Both"
    echo "4) Run database migrations"
    echo "5) Full deployment (all steps)"
    echo "0) Exit"
    echo ""
    read -p "Enter choice: " choice

    case $choice in
        1)
            check_railway
            deploy_backend
            ;;
        2)
            check_vercel
            deploy_frontend
            ;;
        3)
            check_railway
            check_vercel
            deploy_backend
            deploy_frontend
            ;;
        4)
            run_migrations
            ;;
        5)
            check_railway
            check_vercel
            deploy_backend
            run_migrations
            deploy_frontend
            echo -e "\n${GREEN}🎉 Full deployment complete!${NC}"
            ;;
        0)
            exit 0
            ;;
        *)
            echo "Invalid choice"
            main
            ;;
    esac
}

# Check for git
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    echo "Please run 'git init' first"
    exit 1
fi

main
