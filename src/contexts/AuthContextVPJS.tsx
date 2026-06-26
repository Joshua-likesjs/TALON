'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
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
import { auth, database, isFirebaseConfigured } from '@/lib/talon/firebase';

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
  // Campos de polígono público
  isPublicVPJS?: boolean;
  createdByUidVPJS?: string;
  createdByNameVPJS?: string;
  animalCodeVPJS?: string;
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
  savePublicPolygonVPJS: (polygon: PolygonVPJS, animalCode: string) => Promise<void>;
  removePublicPolygonVPJS: (polygonId: string, animalCode: string) => Promise<void>;
  publicPolygonsVPJS: PolygonVPJS[]; // polígonos públicos dos animais rastreados
  setTrackedAnimalCodesForPublicVPJS: (codes: string[]) => void;
}

const AuthContextVPJS = createContext<AuthContextTypeVPJS | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

// Função para sincronizar usuário com Prisma (para sistema de alertas)
async function syncUserWithPrisma(firebaseUid: string, email: string, name: string) {
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid, email, name }),
    });
    console.log('🔥 Usuário sincronizado com Prisma');
  } catch (error) {
    console.error('Erro ao sincronizar usuário com Prisma:', error);
  }
}

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
  const [publicPolygonsVPJS, setPublicPolygonsVPJS] = useState<PolygonVPJS[]>([]); // polígonos públicos dos animais rastreados
  const [trackedAnimalCodesVPJS, setTrackedAnimalCodesVPJS] = useState<string[]>([]); // códigos dos animais sendo rastreados
  const trackedCodesKeyRef = useRef<string>(""); // chave serializada para evitar re-renders desnecessários

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
              
              // Sincronizar usuário com Prisma (para sistema de alertas)
              syncUserWithPrisma(firebaseUser.uid, emailVPJS || dbData.emailVPJS || '', dbData.nomeVPJS || firebaseUser.displayName || 'Usuário');
            } else {
              // Usuário NÃO existe no database - não criar automaticamente
              // Isso significa que foi um login social sem cadastro prévio
              console.log('🔥 onAuthStateChanged - Usuário não existe no database, fazendo signOut')

              if (auth) await firebaseSignOut(auth);
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

  // Listen to public polygons of tracked animals
  useEffect(() => {
    if (!database || trackedAnimalCodesVPJS.length === 0) return;

    const listeners: (() => void)[] = [];
    const publicByAnimal: { [codigo: string]: PolygonVPJS[] } = {};

    trackedAnimalCodesVPJS.forEach((codigo) => {
      const publicRef = ref(database!, `animaisVPJS/${codigo}/polygonsVPJS`);

      const handleSnapshot = (snapshot: any) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: PolygonVPJS[] = [];

          const parse = (polygon: any) => {
            if (polygon && polygon.idVPJS) {
              list.push({
                idVPJS: polygon.idVPJS,
                nomeVPJS: polygon.nomeVPJS || 'Polígono',
                corVPJS: polygon.corVPJS || '#585c2b',
                verticesVPJS: polygon.verticesVPJS || [],
                createdAtVPJS: polygon.createdAtVPJS || Date.now(),
                isPublicVPJS: true,
                createdByUidVPJS: polygon.createdByUidVPJS || '',
                createdByNameVPJS: polygon.createdByNameVPJS || '',
                animalCodeVPJS: codigo,
              });
            }
          };

          if (Array.isArray(data)) {
            data.forEach(parse);
          } else {
            Object.values(data).forEach((p: any) => parse(p));
          }

          publicByAnimal[codigo] = list;
        } else {
          publicByAnimal[codigo] = [];
        }

        // Merge all public polygons
        const allPublic: PolygonVPJS[] = [];
        Object.values(publicByAnimal).forEach((arr) => allPublic.push(...arr));
        setPublicPolygonsVPJS(allPublic);
        console.log('🌐 Polígonos públicos carregados:', allPublic.length);
      };

      onValue(publicRef, handleSnapshot);
      listeners.push(() => off(publicRef));
    });

    return () => listeners.forEach((unsub) => unsub());
  }, [trackedAnimalCodesVPJS]);

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
        
        // Faz login automático após cadastro
        setUserVPJS({
          uidVPJS: firebaseUser.uid,
          emailVPJS: email.toLowerCase(),
          nomeVPJS: nome,
        });
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

  const savePublicPolygonVPJS = useCallback(async (polygon: PolygonVPJS, animalCode: string) => {
    if (!userVPJS) throw new Error('Usuário não está logado');
    if (!isFirebaseConfigured || !database) throw new Error('Firebase não configurado');

    console.log('🌐 Tornando polígono público:', polygon.idVPJS, 'para animal:', animalCode);

    // 1. Salvar no nó do animal
    const animalPolygonsRef = ref(database, `animaisVPJS/${animalCode}/polygonsVPJS`);
    const snapshot = await get(animalPolygonsRef);
    let polygonsList: PolygonVPJS[] = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      if (Array.isArray(data)) {
        polygonsList = data.filter((p: any) => p && p.idVPJS && p.idVPJS !== polygon.idVPJS);
      } else {
        polygonsList = Object.values(data).filter((p: any) => p && p.idVPJS && p.idVPJS !== polygon.idVPJS) as PolygonVPJS[];
      }
    }

    polygonsList.push({
      ...polygon,
      isPublicVPJS: true,
      createdByUidVPJS: userVPJS.uidVPJS,
      createdByNameVPJS: userVPJS.nomeVPJS,
      animalCodeVPJS: animalCode,
    });

    await set(animalPolygonsRef, polygonsList);

    // 2. Remover do nó privado do usuário
    const privatePolygonsRef = ref(database, `usuarios/${userVPJS.uidVPJS}/polygonsVPJS`);
    const privateSnap = await get(privatePolygonsRef);
    if (privateSnap.exists()) {
      const data = privateSnap.val();
      let privateList: PolygonVPJS[] = [];
      if (Array.isArray(data)) {
        privateList = data.filter((p: any) => p && p.idVPJS && p.idVPJS !== polygon.idVPJS);
      } else {
        privateList = Object.values(data).filter((p: any) => p && p.idVPJS && p.idVPJS !== polygon.idVPJS) as PolygonVPJS[];
      }
      await set(privatePolygonsRef, privateList);
    }

    console.log('🌐 Polígono tornado público com sucesso!');
  }, [userVPJS]);

  const removePublicPolygonVPJS = useCallback(async (polygonId: string, animalCode: string) => {
    if (!userVPJS) throw new Error('Usuário não está logado');
    if (!isFirebaseConfigured || !database) throw new Error('Firebase não configurado');

    console.log('🔒 Tornando polígono privado:', polygonId);

    // 1. Buscar o polígono no nó do animal
    const animalPolygonsRef = ref(database, `animaisVPJS/${animalCode}/polygonsVPJS`);
    const snapshot = await get(animalPolygonsRef);

    if (!snapshot.exists()) return;

    const data = snapshot.val();
    let polygonsList: PolygonVPJS[] = Array.isArray(data)
      ? data
      : Object.values(data) as PolygonVPJS[];

    const target = polygonsList.find((p: any) => p.idVPJS === polygonId);
    if (!target) return;

    // 2. Remover do nó do animal
    const newAnimalList = polygonsList.filter((p: any) => p.idVPJS !== polygonId);
    await set(animalPolygonsRef, newAnimalList);

    // 3. Salvar no nó privado do usuário atual
    const privatePolygonsRef = ref(database, `usuarios/${userVPJS.uidVPJS}/polygonsVPJS`);
    const privateSnap = await get(privatePolygonsRef);
    let privateList: PolygonVPJS[] = [];
    if (privateSnap.exists()) {
      const pd = privateSnap.val();
      privateList = Array.isArray(pd) ? pd : Object.values(pd) as PolygonVPJS[];
    }

    privateList.push({
      ...target,
      isPublicVPJS: false,
      createdByUidVPJS: undefined,
      createdByNameVPJS: undefined,
      animalCodeVPJS: undefined,
    });
    await set(privatePolygonsRef, privateList);

    console.log('🔒 Polígono tornado privado com sucesso!');
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

  const setTrackedAnimalCodesForPublicVPJS = useCallback((codes: string[]) => {
    const key = [...codes].sort().join(',');
    if (key !== trackedCodesKeyRef.current) {
      trackedCodesKeyRef.current = key;
      setTrackedAnimalCodesVPJS([...codes]);
    }
  }, []);

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
    savePublicPolygonVPJS,
    removePublicPolygonVPJS,
    publicPolygonsVPJS,
    setTrackedAnimalCodesForPublicVPJS,
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
    timerVPJS,
    savePublicPolygonVPJS,
    removePublicPolygonVPJS,
    publicPolygonsVPJS,
    setTrackedAnimalCodesForPublicVPJS,
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