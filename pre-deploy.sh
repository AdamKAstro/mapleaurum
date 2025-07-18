#!/bin/bash

# Pre-Deployment Sanity Check Script for Netlify
# -------------------------------------------------
# This script will:
# 1. Verify your Git branch and status.
# 2. Check for security vulnerabilities in dependencies.
# 3. Run linter and TypeScript checks for code quality.
# 4. Check for accidentally committed environment variables.
# 5. Create a production build and verify its output.
#
# If any step fails, the script will exit immediately.

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Color Codes for prettier output ---
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_CYAN='\033[0;36m'
COLOR_NC='\033[0m' # No Color

# --- Helper function for logging ---
info() {
  printf "\n${COLOR_CYAN}▶ %s${COLOR_NC}\n" "$1"
}

success() {
  printf "${COLOR_GREEN}✔ %s${COLOR_NC}\n" "$1"
}

warning() {
  printf "${COLOR_YELLOW}⚠ WARNING: %s${COLOR_NC}\n" "$1"
}

error() {
  printf "${COLOR_RED}✖ ERROR: %s${COLOR_NC}\n" "$1" >&2
  exit 1
}

# --- STEP 1: GIT SANITY CHECKS ---
info "Step 1: Running Git Sanity Checks..."

# Check 1.1: Ensure we are on the 'main' branch
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH_NAME" != "main" ]; then
  warning "You are on branch '$BRANCH_NAME', not 'main'."
  read -p "Are you sure you want to continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Deployment cancelled by user. Please switch to the 'main' branch."
  fi
fi

# Check 1.2: Ensure the working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  git status
  error "Uncommitted changes found. Please commit or stash your changes before deploying."
fi

# Check 1.3: Ensure the local branch is up-to-date with the remote
info "Fetching latest changes from remote..."
git fetch
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})
if [ "$LOCAL" != "$REMOTE" ]; then
  error "Your local branch is not up-to-date with the remote. Please 'git pull' first."
fi
success "Git status is clean and up-to-date."

# --- STEP 2: DEPENDENCY CHECKS ---
info "Step 2: Checking Node.js Dependencies..."
echo "Running 'npm install' to ensure everything is up-to-date..."
npm install
echo "Checking for high-severity security vulnerabilities..."
npm audit --audit-level=high
success "Dependencies are installed and secure."

# --- STEP 3: CODE QUALITY & SECURITY CHECKS ---
info "Step 3: Running Code Quality & Security Scans..."
echo "Running Linter..."
npm run lint -- --max-warnings=0 # Fails on any warning
echo "Running TypeScript Compiler Check..."
npx tsc --noEmit
success "Code quality checks passed."

info "Checking for hardcoded secrets..."
# Check if .env file is accidentally tracked by Git
if [ -n "$(git ls-files .env)" ]; then
  error "CRITICAL: The '.env' file is tracked by Git. REMOVE IT from version control immediately!"
fi
# Search for common secret patterns in the src directory
# Add any other secret keys you use to this grep command
if grep -rE "VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|STRIPE" "src/" --exclude-dir="node_modules" --exclude="*.test.tsx"; then
    warning "Potential hardcoded secrets detected above. Please review them carefully."
    read -p "This is a non-blocking warning. Do you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled by user due to potential secrets."
    fi
else
    success "No obvious secrets found in the 'src' directory."
fi


# --- STEP 4: PRODUCTION BUILD ---
info "Step 4: Creating Production Build..."
npm run build
success "Production build completed successfully."

# --- STEP 5: FINAL SUMMARY ---
info "Step 5: Pre-Deployment Check Complete!"
echo "Build output is located in the 'dist' directory:"
ls -lh dist/

printf "\n${COLOR_GREEN}====================================================${COLOR_NC}\n"
printf "${COLOR_GREEN}  All checks passed. You are ready to deploy!  ${COLOR_NC}\n"
printf "${COLOR_GREEN}====================================================${COLOR_NC}\n"

echo "To perform a final review of what you're deploying, run:"
echo -e "${COLOR_YELLOW}git log -1${COLOR_NC}\n"

echo "When you are ready, run the Netlify deploy command:"
echo "For a production deployment:"
echo -e "${COLOR_CYAN}netlify deploy --prod${COLOR_NC}"
echo "For a preview deployment (draft):"
echo -e "${COLOR_CYAN}netlify deploy${COLOR_NC}"