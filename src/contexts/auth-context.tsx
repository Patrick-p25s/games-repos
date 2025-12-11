
// Ce fichier gère l'état d'authentification et les données des utilisateurs pour toute l'application.
"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

// Définit la structure des statistiques pour chaque jeu.
type GameStats = {
  gamesPlayed: number;
  highScore: number;
  totalPlaytime: number; // en secondes
  [key: string]: number | string; // Permet des statistiques spécifiques au jeu comme 'linesCleared'
};

// Définit la structure d'un message dans la boîte de réception.
export type InboxMessage = {
    id: string;
    subject: string;
    message: string;
    date: string;
};

// Définit la structure principale des données de l'utilisateur.
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  stats: {
    overall: {
      totalGames: number;
      totalWins: number;
      favoriteGame: string;
      winRate: number;
      totalPlaytime: number; // Stocké en secondes pour la précision
    },
    games: {
      Quiz: GameStats & { avgAccuracy: number, totalCorrect: number, totalQuestions: number };
      Tetris: GameStats & { linesCleared: number };
      Snake: GameStats & { applesEaten: number };
      "Flippy Bird": GameStats & { pipesPassed: number };
      Memory: GameStats & { bestTime: number }; // en secondes
      Puzzle: GameStats & { bestTime: number }; // en secondes
    }
  },
  inbox: InboxMessage[];
}

// Définit la structure d'une soumission de feedback.
export type Feedback = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  userId: string;
};

// Définit la forme du contexte, y compris l'état et les fonctions d'action.
interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  allUsers: User[];
  allFeedback: Feedback[];
  isAdmin: boolean;
  viewCount: number;
  login: (email: string, name?: string) => void;
  logout: () => void;
  updateUser: (newDetails: Partial<Omit<User, 'stats' | 'id' | 'role'>>) => void;
  updateUserStats: (gameName: keyof User['stats']['games'], newGameStats: Partial<GameStats>) => void;
  resetStats: () => void;
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'date' | 'userId'>) => void;
  deleteFeedback: (feedbackId: number) => void;
  sendReply: (userId: string, subject: string, message: string) => void;
  incrementViewCount: () => void;
  deleteMessage: (messageId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Définit les statistiques par défaut pour un nouvel utilisateur.
const defaultStats: User['stats'] = {
  overall: {
    totalGames: 0,
    totalWins: 0,
    favoriteGame: "N/A",
    winRate: 0,
    totalPlaytime: 0,
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


// Le composant AuthProvider enveloppe l'application et fournit le contexte d'authentification.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Au montage initial, charge toutes les données depuis localStorage, CÔTÉ CLIENT UNIQUEMENT.
  useEffect(() => {
    // Ce code ne s'exécute que dans le navigateur
    if (typeof window !== 'undefined') {
      try {
        const storedAllUsers = localStorage.getItem("nextgen-games-allUsers");
        if (storedAllUsers) {
          const parsedUsers: User[] = JSON.parse(storedAllUsers);
          parsedUsers.forEach(u => {
            if (!u.inbox) u.inbox = [];
            if (!u.stats) u.stats = JSON.parse(JSON.stringify(defaultStats));
          });
          setAllUsers(parsedUsers);
        }

        const storedUser = localStorage.getItem("nextgen-games-user");
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          if (!parsedUser.inbox) parsedUser.inbox = [];
          if (!parsedUser.stats) parsedUser.stats = JSON.parse(JSON.stringify(defaultStats));
          setUser(parsedUser);
        }

        const storedAllFeedback = localStorage.getItem("nextgen-games-allFeedback");
        if (storedAllFeedback) setAllFeedback(JSON.parse(storedAllFeedback));

        const storedViewCount = localStorage.getItem("nextgen-games-viewCount");
        setViewCount(storedViewCount ? JSON.parse(storedViewCount) : 0);
        
      } catch (error) {
        console.error("Échec de l'analyse des données depuis localStorage", error);
        localStorage.clear();
      }
      setIsLoaded(true); // Marque le chargement comme terminé
    }
  }, []);

  // Fonction utilitaire pour sauvegarder l'utilisateur actuellement connecté et la liste de tous les utilisateurs.
  const saveUser = useCallback((userToSave: User | null) => {
    setUser(userToSave);
    if (userToSave) {
        localStorage.setItem("nextgen-games-user", JSON.stringify(userToSave));
        setAllUsers(prevAllUsers => {
            const userIndex = prevAllUsers.findIndex(u => u.id === userToSave.id);
            const newAllUsers = [...prevAllUsers];
            if (userIndex > -1) {
                newAllUsers[userIndex] = userToSave;
            } else {
                newAllUsers.push(userToSave);
            }
            localStorage.setItem("nextgen-games-allUsers", JSON.stringify(newAllUsers));
            return newAllUsers;
        });
    } else {
        localStorage.removeItem("nextgen-games-user");
    }
  }, []);

  // Fonction utilitaire pour sauvegarder les feedbacks dans l'état et localStorage.
  const saveFeedback = useCallback((feedbackData: Feedback[]) => {
    setAllFeedback(feedbackData);
    localStorage.setItem("nextgen-games-allFeedback", JSON.stringify(feedbackData));
  }, []);

  // Fonction de connexion : trouve un utilisateur existant ou en crée un nouveau.
  const login = useCallback((email: string, name?: string) => {
    const isAdminUser = email.toLowerCase() === 'patricknomentsoa.p25s@gmail.com';
    const userId = email.toLowerCase();
    
    const existingUsers = JSON.parse(localStorage.getItem("nextgen-games-allUsers") || "[]") as User[];
    let loggedInUser = existingUsers.find(u => u.id === userId);

    if (!loggedInUser) {
        loggedInUser = {
          id: userId,
          name: name || (isAdminUser ? "Patrick Nomentsoa" : "Player One"),
          email: email,
          avatar: `https://picsum.photos/seed/${email}/96/96`,
          role: isAdminUser ? 'admin' : 'user',
          stats: JSON.parse(JSON.stringify(defaultStats)), // Copie profonde pour la sécurité
          inbox: [],
        };
    } else {
        if (!loggedInUser.inbox) loggedInUser.inbox = [];
        if (!loggedInUser.stats) loggedInUser.stats = JSON.parse(JSON.stringify(defaultStats));
    }
    
    saveUser(loggedInUser);
  }, [saveUser]);

  // Gère la déconnexion de l'utilisateur.
  const logout = useCallback(() => {
    saveUser(null);
  }, [saveUser]);

  // Met à jour les informations de l'utilisateur.
  const updateUser = useCallback((newDetails: Partial<User>) => {
    setUser(currentUser => {
      if (currentUser) {
        const updatedUser = { ...currentUser, ...newDetails };
        saveUser(updatedUser);
        return updatedUser;
      }
      return null;
    });
  }, [saveUser]);
  
  // Met à jour les statistiques d'un jeu pour l'utilisateur.
  const updateUserStats = useCallback((gameName: keyof User['stats']['games'], newGameStats: Partial<GameStats>) => {
    setUser(currentUser => {
        if (!currentUser) return null;

        const updatedUser: User = JSON.parse(JSON.stringify(currentUser));
        
        const gameStats = updatedUser.stats.games[gameName];
        const overallStats = updatedUser.stats.overall;

        gameStats.gamesPlayed = (gameStats.gamesPlayed || 0) + 1;
        gameStats.highScore = Math.max(gameStats.highScore || 0, newGameStats.highScore || 0);
        gameStats.totalPlaytime += newGameStats.totalPlaytime || 0;

        Object.keys(newGameStats).forEach(key => {
            if (!['highScore', 'totalPlaytime', 'gamesPlayed'].includes(key)) {
                const statKey = key as keyof GameStats;
                if (typeof (gameStats as any)[statKey] === 'number') {
                    (gameStats as any)[statKey] = ((gameStats as any)[statKey] || 0) + (newGameStats[statKey] || 0);
                } else {
                     (gameStats as any)[statKey] = newGameStats[statKey];
                }
            }
        });
        
        if (gameName === 'Quiz') {
            const quizStats = gameStats as User['stats']['games']['Quiz'];
            quizStats.avgAccuracy = quizStats.totalQuestions > 0 ? Math.round((quizStats.totalCorrect / quizStats.totalQuestions) * 100) : 0;
        }

        let isWin = false;
        const score = newGameStats.highScore ?? 0;
        if (gameName === 'Quiz') {
             if(score > 0) isWin = true;
        } else if (score > 0) {
             isWin = true;
        }

        overallStats.totalGames = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + g.gamesPlayed, 0);
        if (isWin) {
            overallStats.totalWins = (overallStats.totalWins || 0) + 1;
        }

        overallStats.winRate = overallStats.totalGames > 0 
            ? Math.round(((overallStats.totalWins || 0) / overallStats.totalGames) * 100)
            : 0;
            
        overallStats.totalPlaytime = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + (g.totalPlaytime || 0), 0);
        
        const favorite = Object.entries(updatedUser.stats.games).sort(([, a], [, b]) => (b.totalPlaytime || 0) - (a.totalPlaytime || 0))[0];
        overallStats.favoriteGame = favorite ? favorite[0] : 'N/A';

        saveUser(updatedUser);
        return updatedUser;
    });
  }, [saveUser]);
  
  // Réinitialise toutes les statistiques de l'utilisateur.
  const resetStats = useCallback(() => {
      setUser(currentUser => {
        if (currentUser) {
          const updatedUser = { ...currentUser, stats: JSON.parse(JSON.stringify(defaultStats)) };
          saveUser(updatedUser);
          return updatedUser;
        }
        return null;
      });
  }, [saveUser]);
  
  // Soumet un nouveau feedback.
  const submitFeedback = useCallback((feedbackData: Omit<Feedback, 'id' | 'date' | 'userId'>) => {
    if (!user) return;
    setAllFeedback(currentFeedback => {
        const newFeedback: Feedback = {
            ...feedbackData,
            id: Date.now(),
            date: new Date().toLocaleDateString('en-CA'),
            userId: user.id
        };
        const updatedFeedback = [...currentFeedback, newFeedback];
        localStorage.setItem("nextgen-games-allFeedback", JSON.stringify(updatedFeedback));
        return updatedFeedback;
    });
  }, [user]);

  // Supprime un feedback.
  const deleteFeedback = useCallback((feedbackId: number) => {
    const updatedFeedback = allFeedback.filter(f => f.id !== feedbackId);
    saveFeedback(updatedFeedback);
  }, [allFeedback, saveFeedback]);

  // Envoie une réponse à un utilisateur et met à jour les données de manière atomique.
  const sendReply = useCallback((userId: string, subject: string, message: string) => {
    const newInboxMessage: InboxMessage = {
        id: `msg-${Date.now()}`,
        subject: `Re: ${subject}`,
        message,
        date: new Date().toLocaleDateString('en-CA'),
    };
    
    setAllUsers(currentUsers => {
        const updatedUsers = currentUsers.map(u => {
            if (u.id === userId) {
                const newInbox = u.inbox ? [newInboxMessage, ...u.inbox] : [newInboxMessage];
                return { ...u, inbox: newInbox };
            }
            return u;
        });
        
        localStorage.setItem("nextgen-games-allUsers", JSON.stringify(updatedUsers));
        
        if (user && user.id === userId) {
            const updatedLoggedInUser = updatedUsers.find(u => u.id === userId);
            if (updatedLoggedInUser) {
                setUser(updatedLoggedInUser);
                localStorage.setItem("nextgen-games-user", JSON.stringify(updatedLoggedInUser));
            }
        }
        
        return updatedUsers;
    });
  }, [user]);

  // Supprime un message de la boîte de réception de l'utilisateur.
  const deleteMessage = useCallback((messageId: string) => {
    if (!user) return;
    const updatedUser = { ...user, inbox: user.inbox.filter(msg => msg.id !== messageId) };
    saveUser(updatedUser);
  }, [user, saveUser]);

  // Incrémente le compteur de vues de l'application une seule fois par session.
  const incrementViewCount = useCallback(() => {
    setViewCount(currentCount => {
        const newCount = currentCount + 1;
        try {
            localStorage.setItem("nextgen-games-viewCount", JSON.stringify(newCount));
        } catch (error) {
            console.error("Échec de la mise à jour du compteur de vues dans localStorage", error);
        }
        return newCount;
    });
  }, []);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';

  // Rassemble toutes les valeurs à fournir au contexte.
  const contextValue = {
    isLoggedIn, user, allUsers, isAdmin, login, logout, updateUser, 
    updateUserStats, resetStats, allFeedback, submitFeedback, deleteFeedback, 
    sendReply, viewCount, incrementViewCount, deleteMessage
  };
  
  if (!isLoaded) {
    return null; // ou un spinner de chargement si vous préférez
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour accéder facilement au contexte d'authentification.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
