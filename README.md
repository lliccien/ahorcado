# Monorepo NestJS + AstroJS

Full-stack monorepo template with NestJS backend and AstroJS frontend, managed with Turborepo and pnpm.

## 🚀 Tech Stack

### Backend (API)
- **NestJS 11** - Progressive Node.js framework
- **TypeORM** - ORM for database management
- **PostgreSQL 17** - Primary database
- **Redis 7** - Caching layer
- **Swagger** - API documentation

### Frontend (Web)
- **AstroJS 5** - Modern web framework
- **React 19** - UI library (optional components)
- **Tailwind CSS 4** - Utility-first CSS
- **TypeScript 5** - Type safety

### Development Tools
- **Turborepo** - High-performance build system
- **pnpm 9** - Fast, disk space efficient package manager
- **Docker** - Containerization for development and production
- **ESLint 9** - Code linting
- **Prettier 3** - Code formatting

## 📋 Prerequisites

- Node.js 18+
- pnpm 9+
- Docker & Docker Compose
- Make (optional, for shortcuts)

## 🏁 Quick Start

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd monorepo-nestjs-astrojs-template

# Install dependencies
pnpm install
```

### 2. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Default values work for local development
```

### 3. Start Development Services

```bash
# Using Makefile (recommended)
make dev-up

# Or using docker-compose directly
docker compose --env-file .env -f docker/docker-compose.dev.yml up -d
```

This starts PostgreSQL and Redis containers:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### 4. Run Applications

```bash
# Run all applications
pnpm dev

# Or run specific application
pnpm dev:api    # API on http://localhost:3000
pnpm dev:web    # Web on http://localhost:3001
```

### 5. Access Applications

- **Web App**: http://localhost:3001
- **API**: http://localhost:3000
- **API Documentation (Swagger)**: http://localhost:3000/api/docs

## 📁 Project Structure

```
monorepo-nestjs-astrojs-template/
├── apps/
│   ├── api/                    # NestJS Backend API
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   └── web/                    # AstroJS Frontend
│       ├── src/
│       ├── public/
│       └── package.json
├── docker/                     # Docker Configuration
│   ├── docker-compose.dev.yml  # Development services (PostgreSQL, Redis)
│   ├── docker-compose.prod.yml # Production services (API, Web)
│   ├── Dockerfile.api          # API production image
│   └── Dockerfile.web          # Web production image
├── packages/                   # Shared packages (ready for libraries)
├── .env.example                # Environment variables template
├── Makefile                    # Development shortcuts
├── package.json                # Root package configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── turbo.json                  # Turborepo configuration
```

## 📦 Available Commands

### Development

```bash
pnpm dev           # Start all apps in development mode
pnpm dev:api       # Start API only (port 3000)
pnpm dev:web       # Start Web only (port 3001)
```

### Build

```bash
pnpm build         # Build all apps
pnpm build:api     # Build API only
pnpm build:web     # Build Web only
```

### Production

```bash
pnpm start         # Start all apps in production mode
pnpm start:api     # Start API only
pnpm start:web     # Start Web only
```

### Testing

```bash
pnpm test          # Run all tests
pnpm test:api      # Run API tests
pnpm test:web      # Run Web tests
```

### Code Quality

```bash
pnpm lint          # Lint all apps
pnpm format        # Format code with Prettier
pnpm format:check  # Check code formatting
pnpm type-check    # Check TypeScript types
```

### Cleanup

```bash
pnpm clean         # Clean all build artifacts and node_modules
```

## 🐳 Docker Commands (Makefile)

### Development Services

```bash
make dev-up        # Start PostgreSQL + Redis
make dev-down      # Stop services
make dev-logs      # View logs
make dev-restart   # Restart services
make dev-clean     # Clean containers and volumes
```

### Production Deployment

```bash
make prod-build    # Build production images (API + Web)
make prod-up       # Start production containers
make prod-down     # Stop production services
make prod-logs     # View production logs
make prod-restart  # Restart production services
make prod-rebuild  # Rebuild and restart production
make prod-clean    # Clean production containers and images
```

### Utilities

```bash
make help          # Show all available commands
make status        # Show container status
make clean         # Clean all (dev + prod)
```

## 📖 API Documentation

Swagger documentation is available when running the API:

- **Development**: http://localhost:3000/api/docs
- **Production**: http://localhost:3000/api/docs

Features:
- Interactive API testing
- Request/response schemas
- Authentication endpoints
- Bearer token support

## ⚙️ Environment Variables

Key environment variables (see `.env.example` for full configuration):

### API Configuration
```env
NODE_ENV=development
API_PORT=3000
```

### Database (PostgreSQL)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestjs_db
```

### Cache (Redis)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Web (AstroJS)
```env
WEB_PORT=3001
PUBLIC_API_URL=http://localhost:3000
```

### Optional Configurations
- JWT authentication (commented in `.env.example`)
- CORS settings
- Logging levels
- Analytics integration

## 🚢 Production Deployment

### Prerequisites
- External PostgreSQL database
- External Redis instance (optional but recommended)
- Docker and Docker Compose

### Steps

1. **Configure environment variables**
```bash
# Update .env with production values
DB_HOST=your-production-db-host
REDIS_HOST=your-production-redis-host
```

2. **Build production images**
```bash
make prod-build
```

3. **Start production containers**
```bash
make prod-up
```

4. **Verify deployment**
```bash
make status
make prod-logs
```

The production setup includes:
- Multi-stage Docker builds for minimal image sizes
- Health checks for API and Web services
- Automatic restart policies
- Optimized Node.js production builds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm lint && pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

UNLICENSED - This is a template project

## 🔗 Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [AstroJS Documentation](https://docs.astro.build)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Documentation](https://pnpm.io/)
- [TypeORM Documentation](https://typeorm.io/)
