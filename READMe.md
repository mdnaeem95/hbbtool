# KitchenCloud 🍳☁️

> Empowering Singapore's home-based food businesses with modern digital tools

## Overview

KitchenCloud is a comprehensive platform designed to help home-based F&B businesses in Singapore transition from WhatsApp-based ordering to a professional, streamlined digital storefront.

## 🏗️ Architecture

- **Monorepo Structure** with Turborepo
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: tRPC, Prisma, PostgreSQL
- **Styling**: Tailwind CSS, Shadcn/ui
- **Infrastructure**: Vercel, Neon, Upstash

## 🚀 Getting Started

### Prerequisites

- Node.js 20 LTS
- pnpm 9+
- PostgreSQL (local or Neon)
- Redis (local or Upstash)

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/kitchencloud.git
cd kitchencloud

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Push database schema
pnpm db:push

# Start development servers
pnpm dev
\`\`\`

### Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm test` - Run tests
- `pnpm lint` - Lint code
- `pnpm format` - Format code

## 📁 Project Structure

\`\`\`
kitchencloud/
├── apps/
│   ├── web/         # Customer storefront
│   └── merchant/    # Merchant dashboard
├── packages/
│   ├── ui/          # Shared components
│   ├── database/    # Prisma schema
│   ├── api/         # tRPC routers
│   └── core/        # Business logic
└── services/        # External integrations
\`\`\`

## 🤝 Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.