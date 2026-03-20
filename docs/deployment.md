# Deployment Guide

## Vercel (Recommended)

JumpContact Platform is designed for Vercel deployment.

### Setup

1. **Import Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework preset will auto-detect as Next.js

2. **Configure Environment Variables**

   Add these in the Vercel dashboard under **Settings > Environment Variables**:

   | Variable | Description |
   |----------|-------------|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud service account email |
   | `GOOGLE_PRIVATE_KEY` | Google Cloud private key (PEM format) |
   | `TWILIO_ACCOUNT_SID` | Twilio Account SID |
   | `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
   | `TWILIO_WORKSPACE_SID` | Twilio TaskRouter Workspace SID |

   > **Note:** For `GOOGLE_PRIVATE_KEY`, paste the full PEM key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Vercel handles the newline encoding automatically.

3. **Deploy**
   - Click **Deploy** — Vercel will build and deploy automatically
   - Future pushes to `main` trigger automatic deployments

### Verify Deployment

After deploying, verify backend connections:

```bash
# Check that all APIs are reachable
npm run verify
```

Or visit your deployment URL and confirm data loads on the Live Now page.

## Self-Hosted

### Prerequisites

- Node.js 18+
- npm 9+

### Build and Run

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Start the production server (port 3003)
npm start
```

### Process Manager (PM2)

For production self-hosting, use PM2:

```bash
npm install -g pm2

# Start with PM2
pm2 start npm --name "jumpcontact" -- start

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name dashboard.yourcompany.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

**Build fails with "Cannot find module 'googleapis'"**
- Run `npm ci` to ensure all dependencies are installed

**Dashboard shows no data**
- Verify environment variables are set correctly
- Run `npm run verify` to check API connections
- Confirm the Google service account has read access to the target spreadsheet

**Timezone issues (wrong dates)**
- The app is hardcoded to `America/Edmonton` — ensure your data sources match
- Vercel runs in UTC; the app handles conversion internally

**Recording playback fails**
- Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- Ensure call recording is enabled in your Twilio account
