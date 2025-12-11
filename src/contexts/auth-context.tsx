
"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the shape of statistics for each game.
type GameStats = {
  gamesPlayed: number;
  highScore: number;
  totalPlaytime: number; // in minutes
  [key: string]: number | string; // Allows for game-specific stats like 'linesCleared'
};

// Define the shape for an inbox message.
export type InboxMessage = {
    id: string;
    subject: string;
    message: string;
    date: string;
};

// Define the main User data structure.
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  stats: {
    overall: {
      totalGames: number;
      favoriteGame: string;
      winRate: number; // Not currently implemented, but here for future use.
      totalPlaytime: string; // e.g., '5h 30m'
    },
    games: {
      Quiz: GameStats & { avgAccuracy: number, totalCorrect: number, totalQuestions: number };
      Tetris: GameStats & { linesCleared: number };
      Snake: GameStats & { applesEaten: number };
      "Flippy Bird": GameStats & { pipesPassed: number };
      Memory: GameStats & { bestTime: number }; // in seconds
      Puzzle: GameStats & { bestTime: number }; // in seconds
    }
  },
  inbox: InboxMessage[];
}

// Define the shape for a feedback submission.
export type Feedback = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  userId: string;
};

// Define the context shape, including state and action functions.
interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  allUsers: User[];
  allFeedback: Feedback[];
  isAdmin: boolean;
  viewCount: number;
  login: (email: string, name?: string) => void;
  logout: () => void;
  updateUser: (newDetails: Partial<Omit<User, 'stats'>>) => void;
  updateUserStats: (game: keyof User['stats']['games'], newStats: Partial<GameStats>) => void;
  resetStats: () => void;
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'date' | 'userId'>) => void;
  deleteFeedback: (feedbackId: number) => void;
  sendReply: (userId: string, subject: string, message: string) => void;
  incrementViewCount: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the default/initial stats for a new user.
const defaultStats: User['stats'] = {
  overall: {
    totalGames: 0,
    favoriteGame: "N/A",
    winRate: 0,
    totalPlaytime: "0h 0m",
  },
  games: {
    Quiz: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, avgAccuracy: 0, totalCorrect: 0, totalQuestions: 0 },
    Tetris: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, linesCleared: 0 },
    Snake: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, applesEaten: 0 },
    "Flippy Bird": { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, pipesPassed: 0 },
    Memory: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, bestTime: 0 },
    Puzzle: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, bestTime: 0 },
  }
};

// The AuthProvider component wraps the application and provides the auth context.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [viewCount, setViewCount] = useState(0);

  // On initial mount, load all data from localStorage.
  useEffect(() => {
    try {
      const storedAllUsers = localStorage.getItem("nextgen-games-allUsers");
      if (storedAllUsers) setAllUsers(JSON.parse(storedAllUsers));

      const storedUser = localStorage.getItem("nextgen-games-user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Ensure inbox exists to prevent errors on older data structures.
        if (!parsedUser.inbox) parsedUser.inbox = [];
        setUser(parsedUser);
      }

      const storedAllFeedback = localStorage.getItem("nextgen-games-allFeedback");
      if (storedAllFeedback) setAllFeedback(JSON.parse(storedAllFeedback));

      const storedViewCount = localStorage.getItem("nextgen-games-viewCount");
      if (storedViewCount) setViewCount(JSON.parse(storedViewCount));

    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      // If storage is corrupted, clear it to start fresh.
      localStorage.clear();
    }
  }, []);

  // Helper function to save all users to state and localStorage.
  const saveAllUsers = (usersToSave: User[]) => {
    localStorage.setItem("nextgen-games-allUsers", JSON.stringify(usersToSave));
    setAllUsers(usersToSave);
  }

  // Helper function to save the currently logged-in user.
  const saveUser = (userToSave: User | null) => {
    if (userToSave) {
        if (!userToSave.inbox) userToSave.inbox = [];
        localStorage.setItem("nextgen-games-user", JSON.stringify(userToSave));
        
        const existingUsers = [...allUsers];
        const userIndex = existingUsers.findIndex(u => u.id === userToSave.id);
        
        if (userIndex > -1) {
            existingUsers[userIndex] = userToSave;
        } else {
            existingUsers.push(userToSave);
        }
        saveAllUsers(existingUsers);
    } else {
        localStorage.removeItem("nextgen-games-user");
    }
    setUser(userToSave);
  }

  // Helper function to save feedback to state and localStorage.
  const saveFeedback = (feedbackToSave: Feedback[]) => {
      localStorage.setItem("nextgen-games-allFeedback", JSON.stringify(feedbackToSave));
      setAllFeedback(feedbackToSave);
  }

  // Login function: finds an existing user or creates a new one.
  const login = (email: string, name?: string) => {
    const isAdminUser = email.toLowerCase() === 'patricknomentsoa.p25s@gmail.com';
    const userId = email.toLowerCase();
    
    let loggedInUser = allUsers.find(u => u.id === userId);

    if (!loggedInUser) {
        // Create a new user if one doesn't exist.
        loggedInUser = {
          id: userId,
          name: name || (isAdminUser ? "Patrick Nomentsoa" : "Player One"),
          email: email,
          avatar: `https://picsum.photos/seed/${email}/96/96`,
          role: isAdminUser ? 'admin' : 'user',
          stats: JSON.parse(JSON.stringify(defaultStats)), // Deep copy for safety
          inbox: [],
        };
    } else {
        // Ensure older user data structures are updated.
        if (!loggedInUser.inbox) loggedInUser.inbox = [];
        if (!loggedInUser.stats) loggedInUser.stats = JSON.parse(JSON.stringify(defaultStats));
        if (!loggedInUser.stats.games.Quiz.totalCorrect) {
          loggedInUser.stats.games.Quiz.totalCorrect = 0;
          loggedInUser.stats.games.Quiz.totalQuestions = 0;
        }
    }
    
    saveUser(loggedInUser);
  };

  const logout = () => {
    saveUser(null);
  };

  const updateUser = (newDetails: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...newDetails };
      saveUser(updatedUser);
    }
  };
  
  const updateUserStats = (game: keyof User['stats']['games'], newStats: Partial<GameStats>) => {
     if (user) {
      const updatedUser = { ...user, stats: JSON.parse(JSON.stringify(user.stats)) as User['stats']}; // Deep copy
      const gameStats = updatedUser.stats.games[game];
      
      updatedUser.stats.games[game] = { ...gameStats, ...newStats };

      // Recalculate overall stats
      updatedUser.stats.overall.totalGames = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + g.gamesPlayed, 0);
      
      const totalMinutes = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + g.totalPlaytime, 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      updatedUser.stats.overall.totalPlaytime = `${hours}h ${minutes}m`;
      
      let favoriteGame = "N/A";
      let maxPlaytime = -1;
      Object.entries(updatedUser.stats.games).forEach(([gameName, stats]) => {
          if (stats.totalPlaytime > maxPlaytime) {
              maxPlaytime = stats.totalPlaytime;
              favoriteGame = gameName;
          }
      });
      updatedUser.stats.overall.favoriteGame = favoriteGame;

      saveUser(updatedUser);
    }
  };
  
  const resetStats = () => {
      if (user) {
        const updatedUser = { ...user, stats: JSON.parse(JSON.stringify(defaultStats)) };
        saveUser(updatedUser);
      }
  };
  
  const submitFeedback = (feedbackData: Omit<Feedback, 'id' | 'date' | 'userId'>) => {
    if (!user) return;
    const newFeedback: Feedback = {
      ...feedbackData,
      id: Date.now(),
      date: new Date().toLocaleDateString('en-CA'),
      userId: user.id
    };
    const updatedFeedback = [...allFeedback, newFeedback];
    saveFeedback(updatedFeedback);
  };

  const deleteFeedback = (feedbackId: number) => {
    const updatedFeedback = allFeedback.filter(f => f.id !== feedbackId);
    saveFeedback(updatedFeedback);
  };

  const sendReply = (userId: string, subject: string, message: string) => {
      const users = [...allUsers];
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex > -1) {
          const newInboxMessage: InboxMessage = {
              id: `msg-${Date.now()}`,
              subject: `Re: ${subject}`,
              message,
              date: new Date().toLocaleDateString('en-CA'),
          };
          if (!users[userIndex].inbox) {
            users[userIndex].inbox = [];
          }
          users[userIndex].inbox = [newInboxMessage, ...users[userIndex].inbox];
          saveAllUsers(users);

          // If the admin is replying to themselves, update the current user state too.
          if (user?.id === userId) {
            setUser(users[userIndex]);
          }
      }
  };

  const incrementViewCount = () => {
    try {
      // Use a function to ensure we're updating from the latest state.
      setViewCount(currentCount => {
        const newCount = currentCount + 1;
        localStorage.setItem("nextgen-games-viewCount", JSON.stringify(newCount));
        return newCount;
      });
    } catch (error) {
      console.error("Failed to update view count in localStorage", error);
    }
  };

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';

  const contextValue = {
    isLoggedIn, user, allUsers, isAdmin, login, logout, updateUser, 
    updateUserStats, resetStats, allFeedback, submitFeedback, deleteFeedback, 
    sendReply, viewCount, incrementViewCount
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to easily access the auth context.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
