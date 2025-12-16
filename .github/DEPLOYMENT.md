# GitHub Actions EC2 Deployment - Setup Guide

## Required GitHub Secrets

Before the workflow can run, configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_SSH_PRIVATE_KEY` | Your SSH private key for EC2 access | Contents of your `.pem` or private key file |
| `EC2_HOST` | EC2 instance public IP or hostname | `54.123.45.67` or `ec2-54-123-45-67.compute.amazonaws.com` |
| `EC2_USERNAME` | SSH username for EC2 | `ec2-user`, `ubuntu`, or custom username |

### Getting Your SSH Private Key

```bash
# On your local machine, display your private key
cat ~/.ssh/your-key.pem

# Copy the entire output including:
# -----BEGIN RSA PRIVATE KEY-----
# ... key contents ...
# -----END RSA PRIVATE KEY-----
```

## EC2 Server Prerequisites

Ensure your EC2 instance has the following:

### 1. PM2 Installed Globally
```bash
sudo npm install -g pm2
```

### 2. Application Directory with Correct Permissions
```bash
# Create directory if it doesn't exist
sudo mkdir -p /var/www/wordnoticenter.com

# Set ownership to your user
sudo chown -R $USER:$USER /var/www/wordnoticenter.com
```

### 3. Nginx Configuration
Your nginx configuration is already set up correctly and proxying to port 3000. ✓

### 4. Node.js Installed
```bash
# Verify Node.js is installed
node --version
npm --version
```

## How the Deployment Works

1. **Build Phase** (GitHub Actions runner):
   - Checks out your code
   - Installs dependencies with `npm ci`
   - Builds the Next.js app with `npm run build`
   - Creates a compressed archive of necessary files

2. **Transfer Phase**:
   - Establishes SSH connection to EC2
   - Transfers the deployment archive via SCP

3. **Deploy Phase** (On EC2):
   - Extracts files to `/var/www/wordnoticenter.com`
   - Installs production dependencies
   - Restarts (or starts) the PM2 process named "wordnoticenter"
   - Saves PM2 configuration for auto-restart

## Testing the Workflow

### Option 1: Push to Main Branch
```bash
git add .
git commit -m "Deploy: update application"
git push origin main
```

### Option 2: Manual Trigger (Recommended for First Test)
Add this to your workflow file under the `on:` section:
```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:  # Enables manual trigger
```

Then go to **Actions → Deploy to AWS EC2 → Run workflow**

## Monitoring Deployment

1. **GitHub Actions**: Watch the workflow progress in the Actions tab
2. **SSH to EC2**: Monitor PM2 processes
   ```bash
   ssh your-user@your-ec2-host
   pm2 list
   pm2 logs wordnoticenter
   ```
3. **Website**: Visit https://wordnoticenter.com

## Troubleshooting

### Deployment Fails at SSH Step
- Verify `EC2_SSH_PRIVATE_KEY` is correctly formatted
- Check EC2 security group allows SSH (port 22) from GitHub IPs
- Ensure SSH key has correct permissions

### PM2 Process Won't Start
```bash
# SSH to EC2 and manually test
cd /var/www/wordnoticenter.com
npm start

# Check PM2 logs
pm2 logs wordnoticenter
```

### Site Not Accessible After Deployment
```bash
# Check nginx status
sudo systemctl status nginx

# Check if app is running on port 3000
curl http://localhost:3000

# View nginx error logs
sudo tail -f /var/log/nginx/wordnoticenter.com.error.log
```

## Optional Enhancements

### Auto-restart PM2 on Server Reboot
```bash
# On EC2
pm2 startup
pm2 save
```

### Add Deployment Notifications
Add to workflow after successful deployment:
```yaml
- name: Notify success
  if: success()
  run: |
    # Add Slack, Discord, or email notification
```

### Environment Variables
If your app needs environment variables:

1. **Create `.env.production` on EC2**:
   ```bash
   # On EC2
   nano /var/www/wordnoticenter.com/.env.production
   ```

2. **Exclude from deployment archive** (modify workflow):
   ```yaml
   - name: Create deployment archive
     run: |
       tar -czf deployment.tar.gz \
         --exclude='.env.production' \
         .next package.json package-lock.json next.config.mjs public node_modules
   ```
