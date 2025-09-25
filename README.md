# FGC Robot Hospital 🤖🏥

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A comprehensive inventory management system for FTC (First Tech Challenge) robotics teams, featuring the FGC Kit of Parts database with product images and visual management tools.

## ✨ Features

### 📦 FGC Kit of Parts Inventory
- **155 robotics parts** from the 2025 FGC Kit of Parts
- **Product images** for 120+ parts (77% coverage)
- **Grid-based visual interface** with search and pagination
- **Part details** including descriptions, quantities, and images

### 👥 Admin System
- **Role-based access control (RBAC)** with granular permissions
- **User management** with team assignments
- **Admin dashboard** with system overview
- **Multi-role support** for complex team structures

### 📋 Request Management
- **Maintenance requests** with categorized workflows
- **Status tracking** and team assignment
- **Hardware, software, machining, and battery charging categories
- **Priority management** and automated routing

### 🔧 Spare Parts Management
- **Inventory tracking** for replacement parts
- **CRUD operations** with image support
- **Stock level monitoring**
- **Supplier information** and ordering workflows

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the database:**
   ```bash
   # Run the SQL scripts in src/lib/ to create tables
   # Import FGC data:
   node scripts/import-fgc-inventory.js
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to see the application.

## FGC Image Collection

The system includes an automated image collection script that gathers product images from REV Robotics:

```bash
node scripts/focused-image-search.js
```

**Features:**
- Searches REV Robotics website using known URL patterns
- Handles special collection pages (e.g., MAXSpline components)
- Extracts high-quality images from BigCommerce CDN
- Achieves ~77% success rate (120/155 parts)

## Technology Stack

- **Frontend:** Next.js 15, React, Material-UI, TypeScript
- **Backend:** Next.js API routes, PostgreSQL
- **Database:** PostgreSQL with comprehensive schema
- **Authentication:** NextAuth.js with RBAC
- **Styling:** CSS modules and Material-UI components

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
