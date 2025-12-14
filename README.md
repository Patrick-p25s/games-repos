# NextGen Games

Welcome to NextGen Games, a collection of classic and modern games powered by generative AI. This project was built with Next.js, React, Tailwind CSS, and Genkit.

## Getting Started

Follow these steps to get the project running on your local machine.

### 1. Prerequisites

Make sure you have Node.js (version 18 or higher) and npm installed.

### 2. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 3. Set Up Environment Variables

This project uses Google's Gemini models for its AI features. You will need a Gemini API key.

1.  Create a file named `.env.local` in the root of the project.
2.  Add your API key to the `.env.local` file like this:

    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Running the Development Server

Once the dependencies are installed and the environment variables are set, you can run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result. You can start editing the main page by modifying `src/app/page.tsx`.

### 5. Running Genkit (for AI Development)

If you are working on the AI flows, you can run the Genkit developer UI in a separate terminal:

```bash
npm run genkit:dev
```

This will start the Genkit development server, allowing you to inspect and test your AI flows at [http://localhost:4000](http://localhost:4000).

---

## Updating and Deploying the Application

### How to Update

The easiest way to update the application is to continue the conversation with the AI assistant in Firebase Studio. You can request:
- New features
- Bug fixes
- Design changes
- Code optimizations

The assistant will make the necessary code changes, which you can test in the development environment.

### Deploying to Production with Firebase Hosting

Once you are satisfied with the updates, you need to deploy them to make them live for your users. This project is set up to be deployed with **Firebase Hosting**.

1.  **Build the Application:**
    This command creates an optimized, production-ready version of your app in the `.next` folder.
    ```bash
    npm run build
    ```

2.  **Deploy to Firebase:**
    This command uploads the built application to Firebase Hosting. You will need to have the Firebase CLI installed and be logged into your Firebase account.
    ```bash
    firebase deploy --only hosting
    ```

After the deployment is complete, your updated application will be live at your Firebase Hosting URL.
