# 🎓 USM Event Hub

<div align="center">

**The central platform for discovering and managing campus events at Universiti Sains Malaysia**

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[Live Demo](#) • [Report Bug](#) • [Request Feature](#)

</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Firebase Setup](#firebase-setup)
  - [Running the Application](#running-the-application)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 About The Project

USM Event Hub is a modern, full-stack web application designed to revolutionize how students and administrators at Universiti Sains Malaysia (USM) interact with campus events. Built with cutting-edge technologies, it provides a seamless, intuitive experience for event discovery, registration, and management.

### Why USM Event Hub?

- **Centralized Platform**: All campus events in one place, no more scattered announcements
- **Role-Based Access**: Tailored experiences for students and administrators
- **Real-Time Updates**: Powered by Firebase for instant data synchronization
- **Modern UI/UX**: Beautiful, responsive design that works on any device
- **Secure & Scalable**: Built with security best practices and Firebase's robust infrastructure

---

## ✨ Features

### 👨‍🎓 For Students

- 🔍 **Browse Events**: Discover upcoming campus events with an intuitive interface
- 🎯 **Smart Filtering**: Filter events by price (Free/Paid) and type (Online/Physical)
- 📝 **Easy Registration**: Register for events with just a few clicks
- 📊 **Personal Dashboard**: Track all your registered events (upcoming and past)
- 🔔 **Event Details**: View comprehensive information about each event

### 👨‍💼 For Administrators

- 📈 **Analytics Dashboard**: Monitor event performance with real-time statistics
- ➕ **Event Creation**: Create and publish new events with a user-friendly form
- ✏️ **Event Management**: Edit or delete existing events effortlessly
- 👥 **Attendee Tracking**: View and manage registered attendees for each event
- 🔐 **Role-Based Access**: Secure admin-only features with Firebase Authentication

### 🛡️ Security & Performance

- 🔒 **Secure Authentication**: Email/password login with Firebase Auth
- 🚀 **Fast Performance**: Optimized with Next.js 15 and Turbopack
- 📱 **Responsive Design**: Mobile-first approach for all screen sizes
- 🎨 **Modern UI**: Built with ShadCN UI components and Tailwind CSS
- ⚡ **Real-Time Data**: Firestore integration for instant updates

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15.3](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[ShadCN UI](https://ui.shadcn.com/)** - Beautiful, accessible components
- **[Lucide React](https://lucide.dev/)** - Modern icon library

### Backend & Services
- **[Firebase Authentication](https://firebase.google.com/docs/auth)** - User authentication
- **[Cloud Firestore](https://firebase.google.com/docs/firestore)** - NoSQL database
- **[Firebase App Hosting](https://firebase.google.com/docs/app-hosting)** - Deployment platform

### Form & Validation
- **[React Hook Form](https://react-hook-form.com/)** - Performant form management
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

### AI Integration
- **[Genkit](https://firebase.google.com/docs/genkit)** - AI integration framework
- **[Google Generative AI](https://ai.google.dev/)** - AI capabilities

### Development Tools
- **[Turbopack](https://turbo.build/pack)** - Fast bundler for Next.js
- **[ESLint](https://eslint.org/)** - Code linting
- **[PostCSS](https://postcss.org/)** - CSS processing

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **pnpm** or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **Firebase Account** - [Sign up](https://firebase.google.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/usm-event-hub.git
   cd usm-event-hub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   Or with pnpm:
   ```bash
   pnpm install
   ```

### Firebase Setup

This project requires Firebase for authentication and database services.

1. **Create a Firebase Project**
   - Go to the [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the setup wizard
   - Give your project a name (e.g., "USM Event Hub")

2. **Register a Web App**
   - In your Firebase project, click the web icon (`</>`)
   - Register your app with a nickname
   - Copy the `firebaseConfig` object

3. **Configure Firebase in Your Project**
   - Open `src/lib/firebase.ts`
   - Replace the existing configuration with your Firebase config:

   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Set up Firestore Database**
   - In Firebase Console, go to **Firestore Database**
   - Click "Create database"
   - Start in **test mode** (for development)
   - Choose a location closest to your users

5. **Enable Authentication**
   - In Firebase Console, go to **Authentication**
   - Click "Get started"
   - Enable **Email/Password** sign-in method

6. **Deploy Security Rules** (Optional but recommended)
   - Copy the contents of `firestore.rules`
   - In Firebase Console, go to **Firestore Database** > **Rules**
   - Paste the rules and publish

### Running the Application

1. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:9002](http://localhost:9002)

2. **Build for production**

   ```bash
   npm run build
   npm start
   ```

3. **Run type checking**

   ```bash
   npm run typecheck
   ```

4. **Run linting**

   ```bash
   npm run lint
   ```

---

## 💡 Usage

### Creating Your First Admin User

By default, all new users are registered as students. To create an admin:

1. Register a new account through the login page
2. Go to [Firebase Console](https://console.firebase.google.com/)
3. Navigate to **Firestore Database** > **users** collection
4. Find your user document (document ID = your user UID)
5. Edit the document and change `role` from `"student"` to `"admin"`
6. Log out and log back in to access the admin dashboard

### Student Workflow

1. **Browse Events**: Visit the homepage to see all upcoming events
2. **Filter Events**: Use the filter options to find events by price or type
3. **View Details**: Click on any event card to see full details
4. **Register**: Click the "Register" button on the event detail page
5. **Track Events**: Visit your dashboard to see all registered events

### Admin Workflow

1. **Access Dashboard**: Navigate to `/admin` after logging in as admin
2. **View Analytics**: See event statistics and registration trends
3. **Create Event**: Click "Create Event" and fill in the event details
4. **Manage Events**: Edit or delete events from the events list
5. **View Attendees**: Click on any event to see registered attendees

---

## 📁 Project Structure

```
USMEventHubs/
├── public/                 # Static assets
│   ├── usmbg.jpg          # Background image
│   ├── usmlogo.png        # USM logo
│   └── ...
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── admin/         # Admin dashboard pages
│   │   │   ├── page.tsx   # Main admin dashboard
│   │   │   └── ...
│   │   ├── event/         # Event detail pages
│   │   │   └── [id]/      # Dynamic event routes
│   │   ├── dashboard/     # Student dashboard
│   │   ├── login/         # Authentication pages
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Homepage
│   │   └── globals.css    # Global styles
│   ├── components/        # React components
│   │   ├── ui/            # ShadCN UI components
│   │   ├── Header.tsx     # Navigation header
│   │   ├── Footer.tsx     # Footer component
│   │   ├── EventCard.tsx  # Event card component
│   │   ├── SplashScreen.tsx # Loading splash
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   │   └── useAuth.tsx    # Authentication hook
│   ├── lib/               # Utility functions
│   │   ├── firebase.ts    # Firebase configuration
│   │   └── utils.ts       # Helper functions
│   ├── types/             # TypeScript definitions
│   │   └── index.ts       # Type definitions
│   └── ai/                # AI integration (Genkit)
│       └── dev.ts         # AI development setup
├── firestore.rules        # Firestore security rules
├── apphosting.yaml        # Firebase App Hosting config
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project dependencies
```

---

## 🔒 Security

Security is a top priority for USM Event Hub. The application implements multiple layers of security:

### Firebase Security Rules

The `firestore.rules` file defines strict security rules:

- ✅ Users can only read/write their own profile data
- ✅ Only admins can create, update, or delete events
- ✅ Students can register for events but cannot modify registrations
- ✅ Admins can view all registrations; students can only see their own
- ✅ All writes are validated against schema requirements

### Authentication

- 🔐 Secure email/password authentication via Firebase Auth
- 🔑 Role-based access control (student vs. admin)
- 🚫 Protected routes that redirect unauthorized users
- 🔄 Automatic session management

### Best Practices

- 🛡️ Environment variables for sensitive configuration
- 🔒 HTTPS-only in production
- ✅ Input validation with Zod schemas
- 🧹 XSS protection through React's built-in escaping
- 📝 Type safety with TypeScript

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

### How to Contribute

1. **Fork the Project**
2. **Create your Feature Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your Changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

---

## 📄 License

Distributed under the MIT License. See `LICENSE` file for more information.

---

## 📧 Contact

**Project Maintainer**: Your Name

- 📧 Email: your.email@example.com
- 🐙 GitHub: [@yourusername](https://github.com/yourusername)
- 💼 LinkedIn: [Your Name](https://linkedin.com/in/yourprofile)

**Project Link**: [https://github.com/yourusername/usm-event-hub](https://github.com/yourusername/usm-event-hub)

---

## 🙏 Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- Universiti Sains Malaysia for inspiration

---

<div align="center">

**Made with ❤️ for the USM Community**

⭐ Star this repo if you find it helpful!

</div>
