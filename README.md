# MapleAurum

MapleAurum is a web application delivering financial and operational data on Canadian precious metals companies, with a focus on gold and silver markets. Designed for investors, it provides subscription-based access to detailed company profiles, financial metrics, resource estimates, and production data through a modern, responsive interface.

Live site: [https://mapleaurum.com](https://mapleaurum.com)

## Features
- **Company Profiles**: Detailed data on Canadian precious metals companies, including market cap, enterprise value, and production metrics.
- **Subscription Tiers**: Free, Pro ($40/month or $420/year), and Premium ($90/month or $960/year) plans for varying data access levels.
- **Financial Metrics**: Advanced analytics like price-to-book, EV/resource ounce, and free cash flow (tier-dependent).
- **Resource Estimates**: Insights into reserves, measured/indicated resources, and total AuEq (gold equivalent) metrics.
- **Production Data**: Current and future production, including AISC (all-in sustaining costs) and reserve life.
- **Dynamic Filtering**: Filter and paginate company data by status (e.g., Producer, Explorer), metrics, or search terms.
- **Secure Authentication**: User management via Supabase for seamless login and signup.
- **Stripe Payments**: Secure subscription handling with Stripe Checkout for paid plans.
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Backend**: Supabase (authentication, database, Edge Functions)
- **Payments**: Stripe (subscriptions)
- **Styling**: Tailwind CSS
- **State Management**: React Context API (`AuthContext`, `SubscriptionContext`, `FilterContext`)
- **Data Fetching**: Supabase RPCs for company data and metrics

## Subscriptions
MapleAurum offers three tiers:
- **Free**: Basic company data, limited financial metrics, public profiles.
- **Pro** ($40/month or $420/year): Financial metrics, resource estimates, production data, custom watchlists (upcoming).
- **Premium** ($90/month or $960/year): All Pro features, priority support, advanced metrics, API access (upcoming).

## Contact
For questions or support:
- **GitHub Issues**: [https://github.com/AdamKAstro/mapleaurum/issues](https://github.com/AdamKAstro/mapleaurum/issues)
- **Email**: [your-email@example.com](mailto:your-email@example.com) (replace with your contact email)
- **Website**: [https://mapleaurum.com](https://mapleaurum.com)