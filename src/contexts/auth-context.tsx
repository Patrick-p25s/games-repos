
// Ce fichier gère l'état d'authentification et les données des utilisateurs pour toute l'application.
"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc, runTransaction, addDoc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

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
    read: boolean;
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

// Structure pour les données du classement public
export type LeaderboardUser = {
  id: string;
  name: string;
  stats: User['stats'];
};

// Définit la structure d'une soumission de feedback.
export type Feedback = {
  id: string;
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
  isLoaded: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (newDetails: Partial<Omit<User, 'stats' | 'id' | 'role'>>) => Promise<void>;
  updateUserStats: (gameName: keyof User['stats']['games'], newGameStats: Partial<GameStats>) => Promise<void>;
  resetStats: () => Promise<void>;
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'date' | 'userId'>) => Promise<void>;
  deleteFeedback: (feedbackId: string) => Promise<void>;
  sendReply: (userId: string, subject: string, message: string, originalFeedbackId: string) => Promise<void>;
  incrementViewCount: () => void;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'admin@nextgen.games';

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
  const router = useRouter();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleError = (error: any, defaultMessage: string = "An unexpected error occurred.") => {
    console.error("Firebase operation failed:", error);
    toast({
        variant: "destructive",
        title: "Error",
        description: error.message || defaultMessage,
    });
  };

  const fetchViewCount = useCallback(async () => {
    if (!db) return;
    const viewCounterRef = doc(db, 'app-stats', 'viewCounter');
    try {
      const docSnap = await getDoc(viewCounterRef);
      if (docSnap.exists()) {
          setViewCount(docSnap.data().count);
      } else {
          await setDoc(viewCounterRef, { count: 0 });
          setViewCount(0);
      }
    } catch (e) {
      // Silent fail for view count
    }
  }, [db]);
  
  useEffect(() => {
    fetchViewCount();
  }, [fetchViewCount]);

  const incrementViewCount = useCallback(async () => {
    if (!db) return;
    const viewCounterRef = doc(db, 'app-stats', 'viewCounter');
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(viewCounterRef);
            if (!docSnap.exists()) {
                transaction.set(viewCounterRef, { count: 1 });
                setViewCount(1);
            } else {
                const newCount = (docSnap.data()?.count || 0) + 1;
                transaction.update(viewCounterRef, { count: newCount });
                setViewCount(newCount);
            }
        });
    } catch (e) {
        // Silent fail is acceptable here
    }
  }, [db]);


 const fetchUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!db) return null;
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        const email = firebaseUser.email || "";
        const isAdminUser = email.toLowerCase() === ADMIN_EMAIL;

        if (userDoc.exists()) {
            let userData = { id: userDoc.id, ...userDoc.data() } as User;
            // Ensure admin role is always correct on login
            if (isAdminUser && userData.role !== 'admin') {
                await updateDoc(userDocRef, { role: 'admin' });
                userData.role = 'admin';
            }
            setUser(userData);
            return userData;
        } else {
            // This case should ideally be handled only during signup
            // to avoid creating docs for users who failed to sign up properly.
            // However, it acts as a good fallback.
            return null;
        }
    } catch (e) {
        handleError(e, "Failed to fetch user data.");
        return null;
    }
}, [db]);


  const fetchAdminData = useCallback(async () => {
    if (!db) return;
    try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        setAllUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));

        const feedbackCollection = collection(db, 'feedback');
        const feedbackSnapshot = await getDocs(feedbackCollection);
        setAllFeedback(feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
    } catch(e) {
         handleError(e, "Could not fetch admin data.");
    }
  }, [db]);
  
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminData();
    } else {
      setAllUsers([]);
      setAllFeedback([]);
    }
  }, [user, fetchAdminData]);

  useEffect(() => {
    if (!auth) {
        setIsLoaded(true);
        return;
    };
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoaded(false); // Set loading to true while we process auth state
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
      }
      setIsLoaded(true); // Set loading to false once user data is fetched or cleared
    });
    return () => unsubscribe();
  }, [auth, fetchUserData]);


  const signup = async (name: string, email: string, password: string) => {
    if (!auth || !db) throw new Error("Firebase not initialized.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const isAdminUser = email.toLowerCase() === ADMIN_EMAIL;
    
    const newUser: User = {
      id: firebaseUser.uid,
      name: name,
      email,
      avatar: `https://picsum.photos/seed/${firebaseUser.uid}/96/96`,
      role: isAdminUser ? 'admin' : 'user',
      stats: JSON.parse(JSON.stringify(defaultStats)),
      inbox: [],
    };
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const leaderboardDocRef = doc(db, 'leaderboards', 'all');

    try {
        await runTransaction(db, async (transaction) => {
            const leaderboardDoc = await transaction.get(leaderboardDocRef);
            
            transaction.set(userDocRef, newUser);
            
            const newLeaderboardEntry = { id: newUser.id, name: newUser.name, stats: newUser.stats };

            if (leaderboardDoc.exists()) {
                const currentUsers = leaderboardDoc.data().users as LeaderboardUser[];
                transaction.update(leaderboardDocRef, { users: [...currentUsers, newLeaderboardEntry] });
            } else {
                transaction.set(leaderboardDocRef, { users: [newLeaderboardEntry] });
            }
        });
        setUser(newUser);
    } catch (e) {
        handleError(e, "Signup failed during database setup.");
        throw e;
    }
  };
  
  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized.");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserData(userCredential.user);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null); // Explicitly clear user state on logout
    router.push('/');
  };

  const updateUser = async (newDetails: Partial<User>) => {
    if (!user || !db) return;
    const userDocRef = doc(db, 'users', user.id);
    const leaderboardDocRef = doc(db, 'leaderboards', 'all');

    try {
      await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const leaderboardDoc = await transaction.get(leaderboardDocRef);
        
        // --- WRITE PHASE ---
        transaction.update(userDocRef, newDetails);
        
        if (newDetails.name && leaderboardDoc.exists()) {
            const currentUsers = leaderboardDoc.data().users as LeaderboardUser[];
            const userIndex = currentUsers.findIndex(u => u.id === user.id);
            if (userIndex > -1) {
                currentUsers[userIndex].name = newDetails.name!;
                transaction.update(leaderboardDocRef, { users: currentUsers });
            }
        }
      });
      setUser(currentUser => currentUser ? { ...currentUser, ...newDetails } : null);
    } catch(e) {
      handleError(e, "Failed to update profile.");
      throw e;
    }
  };
  
const updateUserStats = useCallback(async (gameName: keyof User['stats']['games'], newGameStats: Partial<GameStats>) => {
    if (!user || !db) return;
    const userDocRef = doc(db, 'users', user.id);
    const leaderboardDocRef = doc(db, 'leaderboards', 'all');

    try {
        await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            const userDoc = await transaction.get(userDocRef);
            const leaderboardDoc = await transaction.get(leaderboardDocRef);

            if (!userDoc.exists()) {
                throw "Document does not exist!";
            }
            
            // --- CALCULATE AND WRITE PHASE ---
            const currentUserData = userDoc.data() as User;
            const updatedUser: User = JSON.parse(JSON.stringify(currentUserData));

            const gameStats = updatedUser.stats.games[gameName];
            const overallStats = updatedUser.stats.overall;

            gameStats.gamesPlayed = (gameStats.gamesPlayed || 0) + 1;
            gameStats.highScore = Math.max(gameStats.highScore || 0, newGameStats.highScore || 0);
            gameStats.totalPlaytime = (gameStats.totalPlaytime || 0) + (newGameStats.totalPlaytime || 0);

            Object.keys(newGameStats).forEach(key => {
                if (!['highScore', 'totalPlaytime', 'gamesPlayed'].includes(key)) {
                    const statKey = key as keyof GameStats;
                    if (typeof (gameStats as any)[statKey] === 'number' && typeof (newGameStats as any)[statKey] === 'number') {
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
            
            let isWin = (newGameStats.highScore ?? 0) > 0;
            overallStats.totalGames = (overallStats.totalGames || 0) + 1;
            if (isWin) { overallStats.totalWins = (overallStats.totalWins || 0) + 1; }
            overallStats.winRate = overallStats.totalGames > 0 ? Math.round((overallStats.totalWins / overallStats.totalGames) * 100) : 0;
            overallStats.totalPlaytime = Object.values(updatedUser.stats.games).reduce((acc, g) => acc + (g.totalPlaytime || 0), 0);

            const favorite = Object.entries(updatedUser.stats.games).sort(([, a], [, b]) => (b.totalPlaytime || 0) - (a.totalPlaytime || 0))[0];
            overallStats.favoriteGame = favorite ? favorite[0] : 'N/A';
            
            transaction.update(userDocRef, { stats: updatedUser.stats });

            if (leaderboardDoc.exists()) {
                const leaderboardUsers = leaderboardDoc.data().users as LeaderboardUser[];
                const userIndex = leaderboardUsers.findIndex(u => u.id === user.id);
                if (userIndex > -1) {
                    leaderboardUsers[userIndex].stats = updatedUser.stats;
                    transaction.update(leaderboardDocRef, { users: leaderboardUsers });
                } else {
                     transaction.update(leaderboardDocRef, { users: [...leaderboardUsers, { id: updatedUser.id, name: updatedUser.name, stats: updatedUser.stats }] });
                }
            } else {
                transaction.set(leaderboardDocRef, { users: [{ id: updatedUser.id, name: updatedUser.name, stats: updatedUser.stats }] });
            }
            
            setUser(updatedUser);
        });
    } catch (e) {
        handleError(e, "Failed to update game stats.");
        throw e;
    }
}, [user, db]);
  
const resetStats = async () => {
    if (!user || !db) return;
    const userDocRef = doc(db, 'users', user.id);
    const leaderboardDocRef = doc(db, 'leaderboards', 'all');
    const newStats = JSON.parse(JSON.stringify(defaultStats));
    
    try {
        await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            const userDoc = await transaction.get(userDocRef);
            const leaderboardDoc = await transaction.get(leaderboardDocRef);
            
            if (!userDoc.exists()) {
              throw "User document not found!";
            }

            // --- WRITE PHASE ---
            transaction.update(userDocRef, { stats: newStats });
            
            if (leaderboardDoc.exists()) {
                const leaderboardUsers = leaderboardDoc.data().users as LeaderboardUser[];
                const userIndex = leaderboardUsers.findIndex(u => u.id === user.id);
                if (userIndex > -1) {
                    leaderboardUsers[userIndex].stats = newStats;
                    transaction.update(leaderboardDocRef, { users: leaderboardUsers });
                }
            }
        });
        setUser(currentUser => currentUser ? { ...currentUser, stats: newStats } : null);
    } catch (e) {
        handleError(e, "Failed to reset stats.");
        throw e;
    }
};
  
  const submitFeedback = async (feedbackData: Omit<Feedback, 'id' | 'date' | 'userId'>) => {
    if (!user || !db) throw new Error("User not logged in or Firebase not initialized.");
    const newFeedback = { ...feedbackData, userId: user.id, date: new Date().toISOString() };
    try {
        const feedbackCollectionRef = collection(db, 'feedback');
        await addDoc(feedbackCollectionRef, newFeedback);
        if (isAdmin) {
            await fetchAdminData();
        }
    } catch (e) {
        handleError(e, "Failed to submit feedback.");
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!db || !isAdmin) return;
    try {
        const feedbackDocRef = doc(db, 'feedback', feedbackId);
        await deleteDoc(feedbackDocRef);
        setAllFeedback(current => current.filter(f => f.id !== feedbackId));
    } catch (e) {
        handleError(e, "Failed to delete feedback.");
    }
  };

  const sendReply = async (userId: string, subject: string, message: string, originalFeedbackId: string) => {
    if (!db || !isAdmin) return;
    const userDocRef = doc(db, "users", userId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }

            const userData = userDoc.data() as User;
            const newInboxMessage: InboxMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                subject: `Re: ${subject}`,
                message,
                date: new Date().toISOString(),
                read: false,
            };

            const newInbox = [newInboxMessage, ...(userData.inbox || [])];
            transaction.update(userDocRef, { inbox: newInbox });
        });
    } catch (e) {
        handleError(e, "Failed to send reply.");
    }
};

  const deleteMessage = async (messageId: string) => {
    if (!user || !db) return;
    const updatedInbox = user.inbox.filter(msg => msg.id !== messageId);
    const userDocRef = doc(db, 'users', user.id);
    try {
      await updateDoc(userDocRef, { inbox: updatedInbox });
      setUser(currentUser => currentUser ? { ...currentUser, inbox: updatedInbox } : null);
    } catch(e) {
      handleError(e, "Failed to delete message.");
      throw e;
    }
  };
  
  const markMessageAsRead = async (messageId: string) => {
    if (!user || !db) return;
    const updatedInbox = user.inbox.map(msg => msg.id === messageId ? {...msg, read: true} : msg);
    const userDocRef = doc(db, 'users', user.id);
    try {
      await updateDoc(userDocRef, { inbox: updatedInbox });
      setUser(currentUser => currentUser ? { ...currentUser, inbox: updatedInbox } : null);
    } catch(e) {
      handleError(e, "Failed to mark message as read.");
      throw e;
    }
  }

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';

  const contextValue: AuthContextType = {
    isLoggedIn, user, allUsers, isAdmin, login, logout, updateUser, 
    updateUserStats, resetStats, allFeedback, submitFeedback, deleteFeedback, 
    sendReply, viewCount, incrementViewCount, deleteMessage, markMessageAsRead,
    signup,
    isLoaded
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
