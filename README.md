<<<<<<< HEAD
# **USM Event Hub**

this website is used next.js and firebase cloud service
=======
# USM Event Hub

## 🚀 Introduction

Welcome to the USM Event Hub! This is a full-stack web application built with Next.js and Firebase, designed to be the central platform for students and administrators at Universiti Sains Malaysia (USM) to discover, manage, and register for campus events.

The platform provides a seamless experience for students to find upcoming events and a powerful dashboard for administrators to create, monitor, and manage them.

## ✨ Features

- **User Roles:**
    - **Student View:** Browse and filter upcoming events, view event details, and register for events. A personal dashboard shows all registered events (upcoming and past).
    - **Admin View:** A comprehensive dashboard with event analytics, tools to create new events, and a list to edit or delete existing events. Admins can also view registered attendees for each event.
- **Firebase Integration:**
    - **Authentication:** Secure email/password login for both students and administrators, with role-based access control.
    - **Firestore:** Real-time database for storing and retrieving event, registration, and user data.
- **Dynamic Filtering:** Users can filter events on the homepage by price (All, Free, Paid) and type (All, Online, Physical).
- **Responsive Design:** A modern, mobile-first UI built with ShadCN UI and Tailwind CSS that looks great on all devices.
- **Secure by Design:** Firebase Security Rules ensure that users can only access and modify data they are permitted to.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Database & Auth:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
- **Form Management:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation
- **Deployment:** Configured for [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## 🏁 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- `npm` or `pnpm` or `yarn`

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Firebase Setup

This project is configured to use Firebase for authentication and database services. You will need to create your own Firebase project to run it locally.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new Firebase project.
3.  In your project, create a new **Web App**.
4.  Copy the `firebaseConfig` object provided by Firebase.
5.  Replace the existing configuration in `src/lib/firebase.ts` with your own project's configuration.

    ```typescript
    // src/lib/firebase.ts

    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```

6.  **Set up Firestore:**
    - In the Firebase Console, go to **Firestore Database** and create a database. Start in **test mode** for easy local development (you can apply security rules later).
7.  **Set up Authentication:**
    - In the Firebase Console, go to **Authentication**.
    - On the **Sign-in method** tab, enable the **Email/Password** provider.

### Running the Application

Once the dependencies are installed and your Firebase project is configured, you can run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

### Creating an Admin User

By default, all new users are assigned the `student` role. To create an admin user:
1.  Register a new user through the application's login page.
2.  Go to your Firestore database in the Firebase Console.
3.  Navigate to the `users` collection.
4.  Find the document corresponding to the user you just created (the document ID is the user's UID).
5.  Change the `role` field from `"student"` to `"admin"`.
6.  Log out and log back in. You should now have access to the `/admin` dashboard.

## 📁 Folder Structure

```
.
├── src
│   ├── app                # Next.js App Router pages
│   │   ├── admin          # Admin-only pages
│   │   ├── event          # Dynamic event detail pages
│   │   └── ...            # Other top-level pages (home, login, etc.)
│   ├── components         # Reusable React components
│   │   └── ui             # Core UI components from ShadCN
│   ├── hooks              # Custom React hooks (e.g., useAuth)
│   ├── lib                # Utility functions and Firebase config
│   ├── types              # TypeScript type definitions
│   └── ...
├── public                 # Static assets (images, fonts)
├── firestore.rules        # Security rules for Firestore
└── ...                    # Configuration files
```

## 🔒 Firebase Security Rules

The security rules defined in `firestore.rules` are crucial for protecting your data. They define who can read, write, update, or delete documents in your Firestore database. The current rules enforce:
- Users can only modify their own profile.
- Only admins can create, update, or delete events.
- Students can register for events, but cannot see who else is registered.
- Admins can view the registration list for any event.
>>>>>>> aaa10f8bf1d8fe59695c665388c67a924464ae3f
