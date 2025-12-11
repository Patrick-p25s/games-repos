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
      favoriteGame: string;
      winRate: number; // Pas implémenté actuellement, mais présent pour une utilisation future.
      totalPlaytime: number; // Stocké en secondes pour la précision
    },
    games: {
      Quiz: GameStats & { avgAccuracy: number, totalCorrect: number, totalQuestions: number };
      Tetris: GameStats & { linesCleared: number };
      Snake: GameStats & { applesEaten: number };
      "Flippy Bird": GameStats & { pipesPassed: number };
      Memory: GameStats & { bestTime: number; score: number }; // en secondes
      Puzzle: GameStats & { bestTime: number; score: number }; // en secondes
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
  updateUserStats: (game: keyof User['stats']['games'], newStats: Partial<GameStats>) => void;
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
    favoriteGame: "N/A",
    winRate: 0,
    totalPlaytime: 0,
  },
  games: {
    Quiz: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, avgAccuracy: 0, totalCorrect: 0, totalQuestions: 0 },
    Tetris: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, linesCleared: 0 },
    Snake: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, applesEaten: 0 },
    "Flippy Bird": { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, pipesPassed: 0 },
    Memory: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, bestTime: 0, score: 0 },
    Puzzle: { gamesPlayed: 0, highScore: 0, totalPlaytime: 0, bestTime: 0, score: 0 },
  }
};

// Le composant AuthProvider enveloppe l'application et fournit le contexte d'authentification.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [viewCount, setViewCount] = useState(0);

  // Au montage initial, charge toutes les données depuis localStorage.
  useEffect(() => {
    try {
      const storedAllUsers = localStorage.getItem("nextgen-games-allUsers");
      if (storedAllUsers) {
        // Assure l'intégrité des données au chargement
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
      // En cas d'erreur de lecture, on efface tout pour repartir sur une base saine.
      localStorage.clear();
    }
  }, []);

  // Fonction utilitaire pour sauvegarder tous les utilisateurs dans l'état et localStorage.
  const saveAllUsers = useCallback((usersToSave: User[]) => {
    localStorage.setItem("nextgen-games-allUsers", JSON.stringify(usersToSave));
    setAllUsers(usersToSave);
  }, []);

  // Fonction utilitaire pour sauvegarder l'utilisateur actuellement connecté.
  const saveUser = useCallback((userToSave: User | null) => {
    if (userToSave) {
        if (!userToSave.inbox) userToSave.inbox = [];
        if (!userToSave.stats) userToSave.stats = JSON.parse(JSON.stringify(defaultStats));
        localStorage.setItem("nextgen-games-user", JSON.stringify(userToSave));
        
        setAllUsers(prevAllUsers => {
            const existingUsers = [...prevAllUsers];
            const userIndex = existingUsers.findIndex(u => u.id === userToSave.id);
            if (userIndex > -1) {
                existingUsers[userIndex] = userToSave;
            } else {
                existingUsers.push(userToSave);
            }
            localStorage.setItem("nextgen-games-allUsers", JSON.stringify(existingUsers));
            return existingUsers;
        });
    } else {
        localStorage.removeItem("nextgen-games-user");
    }
    setUser(userToSave);
  }, []);

  // Fonction utilitaire pour sauvegarder les feedbacks dans l'état et localStorage.
  const saveFeedback = useCallback((feedbackToSave: Feedback[]) => {
      localStorage.setItem("nextgen-games-allFeedback", JSON.stringify(feedbackToSave));
      setAllFeedback(feedbackToSave);
  }, []);

  // Fonction de connexion : trouve un utilisateur existant ou en crée un nouveau.
  const login = useCallback((email: string, name?: string) => {
    const isAdminUser = email.toLowerCase() === 'patricknomentsoa.p25s@gmail.com';
    const userId = email.toLowerCase();
    
    let loggedInUser = allUsers.find(u => u.id === userId);

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
        // S'assure que les anciens utilisateurs ont les nouvelles structures de données
        if (!loggedInUser.inbox) loggedInUser.inbox = [];
        if (!loggedInUser.stats) loggedInUser.stats = JSON.parse(JSON.stringify(defaultStats));
    }
    
    saveUser(loggedInUser);
  }, [allUsers, saveUser]);

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
  const updateUserStats = useCallback((game: keyof User['stats']['games'], newStats: Partial<GameStats>) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      
      const updatedUser = JSON.parse(JSON.stringify(currentUser)) as User;

      // Met à jour les statistiques spécifiques du jeu
      Object.assign(updatedUser.stats.games[game], newStats);
      
      // Recalcule les statistiques globales
      updatedUser.stats.overall.totalGames = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + g.gamesPlayed, 0);
      
      updatedUser.stats.overall.totalPlaytime = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + g.totalPlaytime, 0);
      
      // Recalcule le jeu favori en se basant sur le temps de jeu le plus élevé.
      let favoriteGame = "N/A";
      let maxPlaytime = -1;
      for (const [gameName, gameData] of Object.entries(updatedUser.stats.games)) {
          if (gameData.totalPlaytime > maxPlaytime) {
              maxPlaytime = gameData.totalPlaytime;
              favoriteGame = gameName;
          }
      }
      updatedUser.stats.overall.favoriteGame = favoriteGame;

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
  
  // Soumet un nouveau feedback de manière atomique.
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
        saveFeedback(updatedFeedback);
        return updatedFeedback;
    });
  }, [user, saveFeedback]);


  // Supprime un feedback.
  const deleteFeedback = useCallback((feedbackId: number) => {
    setAllFeedback(currentFeedback => {
        const updatedFeedback = currentFeedback.filter(f => f.id !== feedbackId);
        saveFeedback(updatedFeedback);
        return updatedFeedback;
    });
  }, [saveFeedback]);

  // Envoie une réponse à un utilisateur et met à jour les données de manière atomique.
  const sendReply = useCallback((userId: string, subject: string, message: string) => {
    const newInboxMessage: InboxMessage = {
        id: `msg-${Date.now()}`,
        subject: `Re: ${subject}`,
        message,
        date: new Date().toLocaleDateString('en-CA'),
    };
    
    // Utilise la forme fonctionnelle de setState pour garantir une mise à jour atomique.
    setAllUsers(currentUsers => {
        const updatedUsers = currentUsers.map(u => {
            if (u.id === userId) {
                // S'assure que 'inbox' est un tableau avant d'y ajouter des éléments.
                const newInbox = u.inbox ? [newInboxMessage, ...u.inbox] : [newInboxMessage];
                return { ...u, inbox: newInbox };
            }
            return u;
        });
        
        // Sauvegarde la liste complète des utilisateurs mise à jour.
        localStorage.setItem("nextgen-games-allUsers", JSON.stringify(updatedUsers));
        
        // Si l'utilisateur qui reçoit la réponse est celui qui est connecté,
        // met à jour son état local pour un affichage immédiat.
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
    const hasIncremented = sessionStorage.getItem("nextgen-games-view-incremented");
    if (!hasIncremented) {
        setViewCount(currentCount => {
            const newCount = currentCount + 1;
            try {
                localStorage.setItem("nextgen-games-viewCount", JSON.stringify(newCount));
                sessionStorage.setItem("nextgen-games-view-incremented", "true");
            } catch (error) {
                console.error("Échec de la mise à jour du compteur de vues dans localStorage", error);
            }
            return newCount;
        });
    }
  }, []);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';

  // Rassemble toutes les valeurs à fournir au contexte.
  const contextValue = {
    isLoggedIn, user, allUsers, isAdmin, login, logout, updateUser, 
    updateUserStats, resetStats, allFeedback, submitFeedback, deleteFeedback, 
    sendReply, viewCount, incrementViewCount, deleteMessage
  };

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
