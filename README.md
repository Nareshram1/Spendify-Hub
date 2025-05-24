# Spendify - Personal Expense Tracker

A modern, responsive web application built with Next.js and Supabase for tracking personal expenses with detailed analytics and insights.

## Features

- **User Authentication**: Secure login/signup with Supabase Auth
- **Expense Management**: Add, view, and categorize expenses
- **Dynamic Categories**: Create custom expense categories
- **Payment Methods**: Track different payment methods (UPI, Cash, Card, Bank Transfer)
- **Analytics Dashboard**: Comprehensive insights with charts and visualizations
- **Time Period Analysis**: Daily, weekly, monthly, yearly, and custom date range views
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Dark theme with accent colors and smooth animations

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time)
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Database Schema

### Categories Table
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);
```

### Expenses Table
```sql
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expense_method TEXT NOT NULL CHECK (expense_method IN ('upi', 'cash', 'card', 'bank_transfer'))
);
```

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spendify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Set up the database tables using the schema above
   - Enable Row Level Security (RLS) and create appropriate policies

4. **Environment Variables**
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Key Features Explained

### Dashboard
- Overview of monthly expenses, total transactions, and average expense
- Recent expenses list with category and payment method details
- Quick access to add new expenses

### Expense Management
- Add expenses with custom categories
- Support for multiple payment methods
- Date selection for backdated entries
- Real-time category creation

### Analytics & Insights
- **Category Breakdown**: Pie chart showing spending distribution
- **Spending Trend**: Line chart tracking expenses over time
- **Payment Methods**: Bar chart of payment method usage
- **Time Period Filters**: Daily, weekly, monthly, yearly, and custom ranges
- **Summary Statistics**: Total amount, transaction count, averages

### Responsive Design
- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interface elements
- Optimized chart displays for mobile devices

## Color Scheme
- **Background**: #171223 (Dark purple)
- **Secondary**: #1f1830 (Lighter purple)
- **Accent**: #0ac7b8 (Teal/Cyan)
- **Text**: White and gray variations

## Security Features
- Row Level Security (RLS) enabled
- User-specific data isolation
- Secure authentication with Supabase Auth
- Protected routes and API calls

## Performance Optimizations
- React 18 features and optimizations
- Efficient data fetching with Supabase
- Optimized re-renders with proper state management
- Lazy loading and code splitting

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License
MIT License - see LICENSE file for details