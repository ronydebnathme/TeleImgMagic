# Telegram Image Processing Platform

A sophisticated web-based platform for advanced image manipulation, processing, and distribution through Telegram.

![Telegram Image Processing Platform](generated-icon.png)

## Key Features

### Authentication System
- Custom username/password authentication
- Role-based access control (admin vs. regular users)
- Session management with secure cookies
- Protected routes for sensitive operations

### Telegram Bot Management
- Separate management panels for bot admins and users
- Add, edit, or remove bot admins with specific permissions
- Manage regular bot users with usage restrictions
- Telegram account integration for message distribution

### Image Processing
- Customizable image editing with metadata handling
- Batch processing options for efficiency
- Scheduled sending to Telegram groups
- User-specific processing environments

## Technology Stack

- **Frontend**: React, TypeScript, Shadcn UI, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom authentication system
- **API Integration**: Telegram API

## Deployment Instructions

We provide multiple deployment options to fit your needs:

### Simple Deployment Options (Recommended)

- **[Ultra Simple Deployment Guide](SIMPLE_DEPLOYMENT.md)**: Deploy in minutes with 1-2 commands
  - One-click cloud deployment (Replit or Render.com)
  - One-command server deployment
  - One-command Docker deployment

### Detailed Deployment Guides

- **[Quick Start Deployment](QUICK_START_DEPLOYMENT.md)**: The fastest way to deploy (15 minutes)
- **[Final Deployment Guide](FINAL_DEPLOYMENT_GUIDE.md)**: Comprehensive step-by-step guide
- **[GitHub Push Guide](GITHUB_PUSH_GUIDE.md)**: How to handle GitHub uploads with large files
- **[Original Deployment Guide](DEPLOYMENT_GUIDE.md)**: Detailed deployment instructions

## Prerequisites

- Node.js 20.x
- PostgreSQL
- ImageMagick
- Exiftool

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `ADMIN_USERNAME`: Default admin username
- `ADMIN_PASSWORD`: Default admin password

Optional Telegram-specific variables:
- `TELEGRAM_API_ID`: Telegram API ID
- `TELEGRAM_API_HASH`: Telegram API Hash

## Quick Start Development

```bash
# Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Install dependencies
npm install

# Start development server
npm run dev
```

## Contributors

- [Your Name](https://github.com/yourusername)

## License

[MIT](LICENSE)
