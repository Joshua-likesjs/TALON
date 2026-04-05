'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ref, set, get, update, onValue, off } from 'firebase/database';
import { auth, database, isFirebaseConfigured } from '@/lib/firebase';

interface UserVPJS {
  uidVPJS: string;
  emailVPJS: string;
  nomeVPJS: string;
}

interface VertexVPJS {
  latitudeVPJS: number;
  longitudeVPJS: number;
}

interface PolygonVPJS {
  idVPJS: string;
  nomeVPJS: string;
  corVPJS: string;
  verticesVPJS: VertexVPJS[];
  createdAtVPJS: number;
}

interface TimerVPJS {
  isActiveVPJS: boolean;
  durationVPJS: number; // duração em segundos
  startedAtVPJS: number; // timestamp de quando iniciou
}

interface AuthContextTypeVPJS {
  userVPJS: UserVPJS | null;
  loadingVPJS: boolean;
  signInVPJS: (email: string, password: string) => Promise<void>;
  signUpVPJS: (nome: string, email: string, password: string) => Promise<void>;
  signOutVPJS: () => Promise<void>;
  resetPasswordVPJS: (email: string) => Promise<void>;
  signInWithGoogleVPJS: () => Promise<void>;
  signInWithFacebookVPJS: () => Promise<void>;
  signUpWithGoogleVPJS: () => Promise<void>;
  signUpWithFacebookVPJS: () => Promise<void>;
  savePolygonsVPJS: (polygons: PolygonVPJS[]) => Promise<void>;
  polygonsVPJS: PolygonVPJS[] | null; // null = ainda não carregado
  saveTimerVPJS: (timer: TimerVPJS | null) => Promise<void>;
  timerVPJS: TimerVPJS | null; // null = sem timer ativo
}

const AuthContextVPJS = createContext<AuthContextTypeVPJS | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

// Local storage keys for demo mode
const LOCAL_USER_KEY = 'geofence_user_vpjs';
const LOCAL_USERS_KEY = 'geofence_users_vpjs';
const LOCAL_POLYGONS_KEY = 'geofence_polygons_vpjs';

// Firebase error messages in Portuguese
function getFirebaseErrorMessage(error: FirebaseError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este email já está cadastrado.';
    case 'auth/invalid-email':
      return 'Email inválido.';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida. Verifique se o login por email/senha está ativado no Firebase Console.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.';
    case 'auth/user-not-found':
      return 'Usuário não encontrado.';
    case 'auth/wrong-password':
      return 'Senha incorreta.';
    case 'auth/invalid-credential':
      return 'Email ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/popup-closed-by-user':
      return 'Login cancelado pelo usuário.';
    case 'auth/popup-blocked':
      return 'Popup bloqueado pelo navegador. Permita popups para este site.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com este email usando outro método de login.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet.';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado no Firebase Console.';
    case 'auth/configuration-not-found':
      return 'Configuração não encontrada. Verifique o Firebase Console.';
    case 'auth/invalid-api-key':
      return 'API Key inválida. Verifique o arquivo .env.local';
    default:
      console.error('Firebase auth error:', error.code, error.message);
      return `Erro: ${error.message}`;
  }
}

// Helper functions for localStorage
function getStoredUser(): UserVPJS | null {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = localStorage.getItem(LOCAL_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

function getStoredUsers(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const users = localStorage.getItem(LOCAL_USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch {
    return [];
  }
}

// Função para verificar se email já existe no Firebase
async function checkEmailExistsInFirebase(email: string): Promise<boolean> {
  if (!database) return false;
  
  try {
    const usersRef = ref(database, 'usuarios');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      // Percorre todos os usuários verificando se o email já existe
      for (const uid in users) {
        if (users[uid].emailVPJS?.toLowerCase() === email.toLowerCase()) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return false;
  }
}

export function AuthProviderVPJS({ children }: { children: React.ReactNode }) {
  const [userVPJS, setUserVPJS] = useState<UserVPJS | null>(null);
  const [loadingVPJS, setLoadingVPJS] = useState(true);
  const [polygonsVPJS, setPolygonsVPJS] = useState<PolygonVPJS[] | null>(null); // null = não carregado ainda
  const [timerVPJS, setTimerVPJS] = useState<TimerVPJS | null>(null); // null = sem timer ativo

  // Firebase auth state listener
  useEffect(() => {
    // Se não tem Firebase configurado, usa modo demo
    if (!isFirebaseConfigured || !auth) {
      console.log('🔥 Demo mode - no Firebase');
      // Usar setTimeout para garantir que está no cliente
      setTimeout(() => {
        const storedUser = getStoredUser();
        if (storedUser) {
          setUserVPJS(storedUser);
        }
        setLoadingVPJS(false);
      }, 0);
      return;
    }

    console.log('🔥 Firebase mode - setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔥 Auth state changed:', firebaseUser?.email || 'no user');
      
      if (firebaseUser) {
        // Usuário logado no Firebase Auth
        // Tentar pegar email de providerData se não estiver no user
        let emailVPJS = firebaseUser.email || '';
        if (!emailVPJS && firebaseUser.providerData && firebaseUser.providerData.length > 0) {
          emailVPJS = firebaseUser.providerData[0].email || '';
          console.log('🔥 onAuthStateChanged - Email do providerData:', emailVPJS);
        }
        
        // Salvar no database se disponível
        if (database) {
          try {
            const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
              // Usuário existe no database - carregar dados
              const dbData = snapshot.val();
              
              // Atualizar email se estiver vazio no database mas temos o email
              if ((!dbData.emailVPJS || dbData.emailVPJS === '') && emailVPJS) {
                console.log('🔥 onAuthStateChanged - Atualizando email vazio para:', emailVPJS);
                await update(userRef, { emailVPJS: emailVPJS });
              }
              
              setUserVPJS({
                uidVPJS: firebaseUser.uid,
                emailVPJS: emailVPJS || dbData.emailVPJS || '',
                nomeVPJS: dbData.nomeVPJS || firebaseUser.displayName || 'Usuário',
              });
            } else {
              // Usuário NÃO existe no database - não criar automaticamente
              // Isso significa que foi um login social sem cadastro prévio
              console.log('🔥 onAuthStateChanged - Usuário não existe no database, fazendo signOut');
              await firebaseSignOut(auth);
              setUserVPJS(null);
            }
          } catch (err) {console.error('🔥 Database error:', err);} 
        } else {
          setUserVPJS({
            uidVPJS: firebaseUser.uid,
            emailVPJS: emailVPJS,
            nomeVPJS: firebaseUser.displayName || 'Usuário',
          });
        }
      } else {
        // Usuário deslogado
        setUserVPJS(null);
      }
      
      setLoadingVPJS(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to polygons updates
  useEffect(() => {
    if (!userVPJS || !database) return;

    const polygonsRef = ref(database, `usuarios/${userVPJS.uidVPJS}/polygonsVPJS`);
    
    const handleSnapshot = (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const polygonsList: PolygonVPJS[] = [];
        
        // Se for um array
        if (Array.isArray(data)) {
          data.forEach((polygon: any) => {
            if (polygon && polygon.idVPJS) {
              polygonsList.push({
                idVPJS: polygon.idVPJS,
                nomeVPJS: polygon.nomeVPJS || `Polígono ${polygonsList.length + 1}`,
                corVPJS: polygon.corVPJS || '#585c2b',
                verticesVPJS: polygon.verticesVPJS || [],
                createdAtVPJS: polygon.createdAtVPJS || Date.now(),
              });
            }
          });
        } else {
          // Se for um objeto
          Object.keys(data).forEach((key) => {
            const polygon = data[key];
            if (polygon && polygon.idVPJS) {
              polygonsList.push({
                idVPJS: polygon.idVPJS,
                nomeVPJS: polygon.nomeVPJS || `Polígono ${polygonsList.length + 1}`,
                corVPJS: polygon.corVPJS || '#585c2b',
                verticesVPJS: polygon.verticesVPJS || [],
                createdAtVPJS: polygon.createdAtVPJS || Date.now(),
              });
            }
          });
        }
        
        console.log('🔥 Polígonos carregados do Firebase:', polygonsList.length);
        setPolygonsVPJS(polygonsList);
      } else {
        setPolygonsVPJS([]);
      }
    };

    onValue(polygonsRef, handleSnapshot);
    return () => off(polygonsRef);
  }, [userVPJS]);

  // Listen to timer updates from Firebase
  useEffect(() => {
    if (!userVPJS || !database) return;

    const timerRef = ref(database, `usuarios/${userVPJS.uidVPJS}/timerVPJS`);
    
    const handleSnapshot = (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('🔥 Timer carregado do Firebase:', data);
        setTimerVPJS({
          isActiveVPJS: data.isActiveVPJS ?? false,
          durationVPJS: data.durationVPJS ?? 0,
          startedAtVPJS: data.startedAtVPJS ?? 0,
        });
      } else {
        setTimerVPJS(null);
      }
    };

    onValue(timerRef, handleSnapshot);
    return () => off(timerRef);
  }, [userVPJS]);

  // Update localStorage for demo mode
  useEffect(() => {
    if (!isFirebaseConfigured) {
      if (userVPJS) {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userVPJS));
      } else {
        localStorage.removeItem(LOCAL_USER_KEY);
      }
    }
  }, [userVPJS]);

  const signInVPJS = useCallback(async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      const users = getStoredUsers();
      const existingUser = users.find((u: any) => u.emailVPJS === email);
      
      if (!existingUser) throw new Error('Usuário não encontrado.');
      if (existingUser.passwordVPJS !== password) throw new Error('Senha incorreta.');
      
      const userData: UserVPJS = {
        uidVPJS: existingUser.uidVPJS,
        emailVPJS: existingUser.emailVPJS,
        nomeVPJS: existingUser.nomeVPJS,
      };
      
      setUserVPJS(userData);
    }
  }, []);

  const signUpVPJS = useCallback(async (nome: string, email: string, password: string) => {
    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    
    if (isFirebaseConfigured && auth) {
      try {
        // Verificar se o email já existe no banco de dados
        const emailExists = await checkEmailExistsInFirebase(email);
        if (emailExists) {
          throw new Error('Já existe uma conta cadastrada com este email.');
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        if (database) {
          const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
          await set(userRef, {
            nomeVPJS: nome,
            emailVPJS: email.toLowerCase(),
            dataCriacaoVPJS: new Date().toISOString(),
            animais: {}
          });
        }
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      const users = getStoredUsers();
      if (users.find((u: any) => u.emailVPJS === email)) {
        throw new Error('Este email já está cadastrado.');
      }
      
      const newUser = {
        uidVPJS: `user_${Date.now()}`,
        nomeVPJS: nome,
        emailVPJS: email,
        passwordVPJS: password,
        dataCriacaoVPJS: new Date().toISOString(),
      };
      
      users.push(newUser);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      
      setUserVPJS({
        uidVPJS: newUser.uidVPJS,
        emailVPJS: newUser.emailVPJS,
        nomeVPJS: newUser.nomeVPJS,
      });
    }
  }, []);

  const signOutVPJS = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    setUserVPJS(null);
    setPolygonsVPJS(null);
  }, []);

  const resetPasswordVPJS = useCallback(async (email: string) => {
    if (isFirebaseConfigured && auth) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      const users = getStoredUsers();
      if (!users.find((u: any) => u.emailVPJS === email)) {
        throw new Error('Este email não está cadastrado.');
      }
    }
  }, []);

  // ============================================
  // LOGIN SOCIAL - Só entra se já tiver conta no database
  // ============================================
  const signInWithGoogleVPJS = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        const firebaseUser = userCredential.user;
        
        console.log('🔥 Google login - email:', firebaseUser.email);
        console.log('🔥 Google login - displayName:', firebaseUser.displayName);
        console.log('🔥 Google login - providerData:', firebaseUser.providerData);
        
        // Tentar pegar email de providerData se não estiver no user
        let emailVPJS = firebaseUser.email || '';
        if (!emailVPJS && firebaseUser.providerData && firebaseUser.providerData.length > 0) {
          emailVPJS = firebaseUser.providerData[0].email || '';
          console.log('🔥 Email do providerData:', emailVPJS);
        }
        
        // Verificar se o usuário já existe no database
        if (database) {
          const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          if (!snapshot.exists()) {
            // Usuário NÃO existe no database - fazer signOut e mostrar erro
            console.log('🔥 Login Google - Usuário não existe no database');
            await firebaseSignOut(auth);
            throw new Error('Conta não encontrada. Por favor, cadastre-se primeiro.');
          }
          
          console.log('🔥 Login Google - Usuário encontrado, login permitido');
          
          // Atualizar email se estiver vazio
          const existingData = snapshot.val();
          if ((!existingData.emailVPJS || existingData.emailVPJS === '') && emailVPJS) {
            console.log('🔥 Atualizando email vazio para:', emailVPJS);
            await update(userRef, { emailVPJS: emailVPJS });
          }
        }
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      setUserVPJS({
        uidVPJS: `google_${Date.now()}`,
        emailVPJS: 'usuario@gmail.com',
        nomeVPJS: 'Usuário Google',
      });
    }
  }, []);

  const signInWithFacebookVPJS = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithPopup(auth, facebookProvider);
        const firebaseUser = userCredential.user;
        
        console.log('🔥 Facebook login - email:', firebaseUser.email);
        console.log('🔥 Facebook login - displayName:', firebaseUser.displayName);
        console.log('🔥 Facebook login - providerData:', firebaseUser.providerData);
        
        // Tentar pegar email de providerData se não estiver no user
        let emailVPJS = firebaseUser.email || '';
        if (!emailVPJS && firebaseUser.providerData && firebaseUser.providerData.length > 0) {
          emailVPJS = firebaseUser.providerData[0].email || '';
          console.log('🔥 Email do providerData:', emailVPJS);
        }
        
        // Verificar se o usuário já existe no database
        if (database) {
          const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          if (!snapshot.exists()) {
            // Usuário NÃO existe no database - fazer signOut e mostrar erro
            console.log('🔥 Login Facebook - Usuário não existe no database');
            await firebaseSignOut(auth);
            throw new Error('Conta não encontrada. Por favor, cadastre-se primeiro.');
          }
          
          console.log('🔥 Login Facebook - Usuário encontrado, login permitido');
          
          // Atualizar email se estiver vazio
          const existingData = snapshot.val();
          if ((!existingData.emailVPJS || existingData.emailVPJS === '') && emailVPJS) {
            console.log('🔥 Atualizando email vazio para:', emailVPJS);
            await update(userRef, { emailVPJS: emailVPJS });
          }
        }
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      setUserVPJS({
        uidVPJS: `facebook_${Date.now()}`,
        emailVPJS: 'usuario@facebook.com',
        nomeVPJS: 'Usuário Facebook',
      });
    }
  }, []);

  // ============================================
  // CADASTRO SOCIAL - Cria conta nova no database
  // ============================================
  const signUpWithGoogleVPJS = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        const firebaseUser = userCredential.user;
        
        console.log('🔥 Google signup - email:', firebaseUser.email);
        console.log('🔥 Google signup - displayName:', firebaseUser.displayName);
        console.log('🔥 Google signup - providerData:', firebaseUser.providerData);
        
        // Tentar pegar email de providerData se não estiver no user
        let emailVPJS = firebaseUser.email || '';
        if (!emailVPJS && firebaseUser.providerData && firebaseUser.providerData.length > 0) {
          emailVPJS = firebaseUser.providerData[0].email || '';
          console.log('🔥 Email do providerData:', emailVPJS);
        }
        
        const nomeVPJS = firebaseUser.displayName || 'Usuário Google';
        
        if (database) {
          const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            // Já existe - não criar novamente
            console.log('🔥 Signup Google - Conta já existe, fazendo login');
          } else {
            // Verificar se o email já existe em outra conta
            const emailExists = await checkEmailExistsInFirebase(emailVPJS);
            if (emailExists) {
              await firebaseSignOut(auth);
              throw new Error('Já existe uma conta cadastrada com este email do Google.');
            }
            
            // Criar nova conta
            console.log('🔥 Signup Google - Criando nova conta com email:', emailVPJS);
            await set(userRef, {
              nomeVPJS: nomeVPJS,
              emailVPJS: emailVPJS.toLowerCase(),
              dataCriacaoVPJS: new Date().toISOString(),
              animais: {}
            });
            console.log('🔥 Signup Google - Conta criada com sucesso!');
          }
        }
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      setUserVPJS({
        uidVPJS: `google_${Date.now()}`,
        emailVPJS: 'usuario@gmail.com',
        nomeVPJS: 'Usuário Google',
      });
    }
  }, []);

  const signUpWithFacebookVPJS = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithPopup(auth, facebookProvider);
        const firebaseUser = userCredential.user;
        
        console.log('🔥 Facebook signup - email:', firebaseUser.email);
        console.log('🔥 Facebook signup - displayName:', firebaseUser.displayName);
        console.log('🔥 Facebook signup - providerData:', firebaseUser.providerData);
        
        // Tentar pegar email de providerData se não estiver no user
        let emailVPJS = firebaseUser.email || '';
        if (!emailVPJS && firebaseUser.providerData && firebaseUser.providerData.length > 0) {
          emailVPJS = firebaseUser.providerData[0].email || '';
          console.log('🔥 Email do providerData:', emailVPJS);
        }
        
        const nomeVPJS = firebaseUser.displayName || 'Usuário Facebook';
        
        if (database) {
          const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            // Já existe - não criar novamente
            console.log('🔥 Signup Facebook - Conta já existe, fazendo login');
          } else {
            // Verificar se o email já existe em outra conta
            const emailExists = await checkEmailExistsInFirebase(emailVPJS);
            if (emailExists) {
              await firebaseSignOut(auth);
              throw new Error('Já existe uma conta cadastrada com este email do Facebook.');
            }
            
            // Criar nova conta
            console.log('🔥 Signup Facebook - Criando nova conta com email:', emailVPJS);
            await set(userRef, {
              nomeVPJS: nomeVPJS,
              emailVPJS: emailVPJS.toLowerCase(),
              dataCriacaoVPJS: new Date().toISOString(),
              animais: {}
            });
            console.log('🔥 Signup Facebook - Conta criada com sucesso!');
          }
        }
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(getFirebaseErrorMessage(error));
        }
        throw error;
      }
    } else {
      setUserVPJS({
        uidVPJS: `facebook_${Date.now()}`,
        emailVPJS: 'usuario@facebook.com',
        nomeVPJS: 'Usuário Facebook',
      });
    }
  }, []);

  const savePolygonsVPJS = useCallback(async (polygons: PolygonVPJS[]) => {
    if (!userVPJS) throw new Error('Usuário não está logado');
    
    console.log('🔥 Salvando polígonos:', polygons.length);
    
    if (isFirebaseConfigured && database) {
      const polygonsRef = ref(database, `usuarios/${userVPJS.uidVPJS}/polygonsVPJS`);
      await set(polygonsRef, polygons);
      console.log('🔥 Polígonos salvos no Firebase!');
    } else {
      const polygonsKey = `${LOCAL_POLYGONS_KEY}_${userVPJS.uidVPJS}`;
      localStorage.setItem(polygonsKey, JSON.stringify(polygons));
      setPolygonsVPJS(polygons);
    }
  }, [userVPJS]);

  const saveTimerVPJS = useCallback(async (timer: TimerVPJS | null) => {
    if (!userVPJS) throw new Error('Usuário não está logado');
    
    console.log('🔥 Salvando timer:', timer);
    
    if (isFirebaseConfigured && database) {
      const timerRef = ref(database, `usuarios/${userVPJS.uidVPJS}/timerVPJS`);
      if (timer) {
        await set(timerRef, timer);
        console.log('🔥 Timer salvo no Firebase!');
      } else {
        await set(timerRef, null);
        console.log('🔥 Timer removido do Firebase!');
      }
    }
  }, [userVPJS]);

  const value = useMemo(() => ({
    userVPJS,
    loadingVPJS,
    signInVPJS,
    signUpVPJS,
    signOutVPJS,
    resetPasswordVPJS,
    signInWithGoogleVPJS,
    signInWithFacebookVPJS,
    signUpWithGoogleVPJS,
    signUpWithFacebookVPJS,
    savePolygonsVPJS,
    polygonsVPJS,
    saveTimerVPJS,
    timerVPJS,
  }), [
    userVPJS, 
    loadingVPJS, 
    signInVPJS, 
    signUpVPJS, 
    signOutVPJS, 
    resetPasswordVPJS, 
    signInWithGoogleVPJS, 
    signInWithFacebookVPJS,
    signUpWithGoogleVPJS,
    signUpWithFacebookVPJS,
    savePolygonsVPJS,
    polygonsVPJS,
    saveTimerVPJS,
    timerVPJS
  ]);

  return (
    <AuthContextVPJS.Provider value={value}>
      {children}
    </AuthContextVPJS.Provider>
  );
}

export function useAuthVPJS() {
  const context = useContext(AuthContextVPJS);
  if (context === undefined) {
    throw new Error('useAuthVPJS must be used within an AuthProviderVPJS');
  }
  return context;
}
