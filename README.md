# Sakhi - Your Safety Companion

A high-performance, mobile-first safety navigation web application built with the MERN stack (adapted for Supabase). Sakhi helps users navigate safely by providing route safety scores, guardian mode tracking, and community-powered safety reports.

## Features

### Core Modules

#### 1. Guardian Mode
- Real-time monitored walks with location tracking
- Emergency SOS button for instant alerts
- Session tracking with start/end locations
- Emergency contact notification system

#### 2. Safety Route Engine
- Calculate safety scores (0-100) for routes
- Prioritizes residential areas and well-lit streets
- Considers proximity to safe havens (hospitals, police stations, 24/7 businesses)
- Avoids areas with reported safety concerns

#### 3. Community Safety Reports
- Report broken lights, unsafe areas, and safe havens
- Upload photos of hazards
- Upvote system for community validation
- Severity ratings (1-5)
- Status tracking (pending, verified, resolved)

#### 4. Rewards System
- Earn Safety Credits for community contributions
- Tiered achievement system:
  - Safety Explorer (0-19 credits)
  - Community Hero (20-49 credits)
  - Safety Champion (50-99 credits)
  - Guardian Elite (100+ credits)
- Automatic credit awards when reports are verified

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development and builds
- **Tailwind CSS** with custom dark theme
- **React Suspense** and lazy loading for performance
- **Lucide React** for icons

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security (RLS)
- **Edge Functions** for serverless API endpoints

### Database Schema
- `profiles` - User profiles with safety credits
- `safe_havens` - Verified safe locations
- `safety_reports` - Community safety reports
- `guardian_sessions` - Active monitoring sessions
- `route_ratings` - User feedback on routes

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd sakhi
```

2. Install dependencies
```bash
npm install
```

3. Environment Configuration
The `.env` file is already configured with Supabase credentials:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Database Setup
The database schema has already been applied. It includes:
- User profiles with emergency contacts
- Safety reports with location tracking
- Safe havens database
- Guardian session tracking
- Automatic credit rewards system

5. Start the development server
```bash
npm run dev
```

6. Build for production
```bash
npm run build
```

## Project Structure

```
sakhi/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Layout.tsx
│   │   └── BottomNav.tsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/              # Utility libraries
│   │   └── supabase.ts
│   ├── pages/            # Main application pages
│   │   ├── Auth.tsx      # Login/Signup
│   │   ├── Home.tsx      # Guardian Mode dashboard
│   │   ├── MapView.tsx   # Navigation and safe havens
│   │   ├── Reports.tsx   # Community reports
│   │   └── Profile.tsx   # User profile and rewards
│   ├── types/            # TypeScript definitions
│   │   └── database.ts
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── supabase/
│   └── functions/        # Edge functions
│       └── calculate-safety-score/
└── public/              # Static assets
```

## Design System

### Color Palette
- **Space Navy** - Primary background colors (#0a1929 to #020509)
- **Neon Cyan** - Primary accent color (#00e1ff)
- **Soft Lavender** - Secondary accent color (#8b5cf6)

### Typography
- Mobile-first responsive design
- Clear visual hierarchy
- High contrast for readability

### Interactions
- Haptic-like button feedback
- Smooth transitions (0.3s cubic-bezier)
- Bottom navigation for mobile UX
- Floating SOS button during Guardian Mode

## API Endpoints

### Edge Functions

#### Calculate Safety Score
```
POST /functions/v1/calculate-safety-score
```

Calculates a safety score (0-100) for a given route based on:
- Nearby safe havens
- Verified safety reports
- Route length
- Community feedback

## Security Features

### Row Level Security (RLS)
All database tables have RLS enabled with policies:
- Users can only view/edit their own data
- Verified safe havens are publicly readable
- Community reports are visible when verified
- Guardian sessions are private to users

### Authentication
- Supabase Auth with email/password
- JWT tokens for API authentication
- Secure session management
- Password encryption with bcrypt

## Performance Optimizations

1. **Code Splitting**
   - React.lazy() for page components
   - Suspense boundaries for loading states

2. **Build Optimization**
   - Vite's optimized bundling
   - Tree shaking for smaller bundles
   - CSS optimization with Tailwind

3. **Database**
   - Indexes on location columns
   - Efficient queries with proper filtering
   - Caching for static data

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code with ESLint
- `npm run typecheck` - Type check with TypeScript

### Code Quality

- TypeScript for type safety
- ESLint for code quality
- Strict mode enabled
- Component-based architecture

## Contributing

When contributing to this project:
1. Follow the existing code style
2. Use TypeScript for all new files
3. Add proper RLS policies for new tables
4. Test on mobile devices
5. Ensure accessibility standards

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on the GitHub repository.

---

Built with empowerment and safety in mind.
