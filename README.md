# LIMHS Cafeteria Meal Token System

A digital meal token management system for cafeterias built with Next.js 14, Tailwind CSS, and Supabase.

## Features

- **Scanner Station** - Full-screen QR scanner for generating meal tokens
- **Token Verification** - Verify and collect tokens at the collection counter
- **Admin Dashboard** - Overview of daily stats and quick actions
- **Member Management** - Add, edit, and manage cafeteria members
- **Meal Packages** - Create reusable meal packages for easy top-ups
- **Top-up System** - Add meals to member accounts with transaction tracking
- **Card Printing** - Generate and print member ID cards with QR codes
- **Reports** - View daily/weekly/monthly activity reports

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **QR Code:** html5-qrcode (scanning), qrcode.react (generation)
- **Notifications:** Sonner

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd limhs-cafeteria
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `database/schema.sql`
   - Get your project URL and anon key from Project Settings > API

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Add sound files (optional)**

   Add audio feedback files to `public/sounds/`:
   - `success.mp3` - Played on successful scan/action
   - `error.mp3` - Played on errors

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open the application**

   Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
limhs-cafeteria/
├── app/
│   ├── layout.js              # Root layout
│   ├── page.js                # Landing page
│   ├── globals.css            # Global styles
│   ├── scanner/
│   │   └── page.js            # QR Scanner Station
│   ├── verify/
│   │   └── page.js            # Token Verification
│   ├── admin/
│   │   ├── layout.js          # Admin layout with sidebar
│   │   ├── page.js            # Admin Dashboard
│   │   ├── members/
│   │   │   ├── page.js        # Member List
│   │   │   ├── add/page.js    # Add Member
│   │   │   └── [id]/page.js   # Edit Member
│   │   ├── packages/
│   │   │   └── page.js        # Meal Packages
│   │   ├── topup/
│   │   │   └── page.js        # Top-up Meals
│   │   ├── cards/
│   │   │   └── page.js        # Print Member Cards
│   │   └── reports/
│   │       └── page.js        # Reports
│   └── api/
│       ├── members/           # Member CRUD API
│       ├── scan/              # QR Scan API
│       ├── tokens/            # Token generation API
│       ├── verify/            # Token verification API
│       ├── packages/          # Packages CRUD API
│       ├── topup/             # Top-up API
│       └── reports/           # Reports API
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── Scanner/               # Scanner components
│   ├── Token/                 # Token display/receipt
│   ├── Cards/                 # Member card components
│   └── Admin/                 # Admin panel components
├── lib/
│   ├── supabase.js            # Supabase client
│   ├── utils.js               # Utility functions
│   ├── constants.js           # App constants
│   └── printer.js             # Print utilities
├── hooks/
│   ├── useScanner.js          # QR scanner hook
│   └── usePrinter.js          # Print hook
├── context/
│   └── AuthContext.js         # Auth context
├── database/
│   └── schema.sql             # Database schema
└── public/
    └── sounds/                # Audio files
```

## Usage

### Scanner Station (`/scanner`)

1. Open the scanner page on a kiosk device
2. Member scans their QR code
3. System displays member info and balance
4. Click "Generate Token" to create a meal token
5. Token is printed automatically (if printer connected)

### Token Verification (`/verify`)

1. Open the verification page at the collection counter
2. Enter token number or scan token QR code
3. Verify token details
4. Click "Collect Token" to mark as collected

### Admin Panel (`/admin`)

- **Dashboard** - View daily stats and quick actions
- **Members** - Manage member accounts
- **Packages** - Create/edit meal packages
- **Top-up** - Add meals to member accounts
- **Cards** - Generate and print member ID cards
- **Reports** - View activity reports

## Database Schema

The system uses the following main tables:

- `organizations` - Cafeteria/organization settings
- `members` - Member accounts with balance
- `meal_packages` - Predefined meal packages
- `meal_tokens` - Generated tokens with status
- `transactions` - All balance changes
- `daily_token_counter` - Auto-increment token numbers per day

See `database/schema.sql` for the complete schema.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List all members |
| POST | `/api/members` | Create new member |
| GET | `/api/members/[id]` | Get member details |
| PUT | `/api/members/[id]` | Update member |
| DELETE | `/api/members/[id]` | Delete member |
| POST | `/api/scan` | Scan member QR code |
| GET | `/api/tokens` | List tokens |
| POST | `/api/tokens` | Generate new token |
| GET | `/api/verify` | Search/verify token |
| POST | `/api/verify` | Collect token |
| GET | `/api/packages` | List packages |
| POST | `/api/packages` | Create package |
| POST | `/api/topup` | Process top-up |
| GET | `/api/reports` | Generate reports |

## Customization

### Changing Colors

Edit `tailwind.config.js` to modify the primary and secondary colors:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom green shades
      },
      secondary: {
        // Your custom yellow shades
      },
    },
  },
},
```

### Meal Types

Edit `lib/constants.js` to modify meal types and time ranges:

```js
export const MEAL_TYPES = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
};

export const MEAL_TIME_RANGES = {
  BREAKFAST: { start: 6, end: 10 },
  LUNCH: { start: 11, end: 15 },
  DINNER: { start: 17, end: 21 },
};
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Other Platforms

Build the production version:
```bash
npm run build
npm start
```

## License

MIT License

## Support

For issues and feature requests, please open an issue on the repository.
