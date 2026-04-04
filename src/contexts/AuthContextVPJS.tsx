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
import { auth, database } from '@/lib/firebase';

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
  firebaseErrorVPJS: string | null;
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
      return 'API Key inválida. Verifique as variáveis de ambiente.';
    default:
      console.error('Firebase auth error:', error.code, error.message);
      return `Erro: ${error.message}`;
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
  const [firebaseErrorVPJS, setFirebaseErrorVPJS] = useState<string | null>(null);
  const [polygonsVPJS, setPolygonsVPJS] = useState<PolygonVPJS[] | null>(null); // null = não carregado ainda
  const [timerVPJS, setTimerVPJS] = useState<TimerVPJS | null>(null); // null = sem timer ativo

  // Firebase auth state listener
  useEffect(() => {
    // Verificar se o Firebase está configurado
    if (!auth || !database) {
      console.error('❌ Firebase não configurado! Configure as variáveis de ambiente.');
      setFirebaseErrorVPJS('Firebase não configurado. Configure as variáveis de ambiente no Vercel.');
      setLoadingVPJS(false);
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
        
        // Buscar dados do usuário no database
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
        } catch (err) {
          console.error('🔥 Database error:', err);
          // Em caso de erro, permitir login mesmo assim
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
                corVPJS: polygon.corVPJS || '#22c55e',
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
                corVPJS: polygon.corVPJS || '#22c55e',
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

  const signInVPJS = useCallback(async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase não configurado.');
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  const signUpVPJS = useCallback(async (nome: string, email: string, password: string) => {
    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    
    if (!auth || !database) {
      throw new Error('Firebase não configurado.');
    }
    
    try {
      // Verificar se o email já existe no banco de dados
      const emailExists = await checkEmailExistsInFirebase(email);
      if (emailExists) {
        throw new Error('Já existe uma conta cadastrada com este email.');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userRef = ref(database, `usuarios/${firebaseUser.uid}`);
      await set(userRef, {
        nomeVPJS: nome,
        emailVPJS: email.toLowerCase(),
        dataCriacaoVPJS: new Date().toISOString(),
        animais: {}
      });
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  const signOutVPJS = useCallback(async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUserVPJS(null);
    setPolygonsVPJS(null);
    setTimerVPJS(null);
  }, []);

  const resetPasswordVPJS = useCallback(async (email: string) => {
    if (!auth) {
      throw new Error('Firebase não configurado.');
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  // ============================================
  // LOGIN SOCIAL - Só entra se já tiver conta no database
  // ============================================
  const signInWithGoogleVPJS = useCallback(async () => {
    if (!auth || !database) {
      throw new Error('Firebase não configurado.');
    }
    
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
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  const signInWithFacebookVPJS = useCallback(async () => {
    if (!auth || !database) {
      throw new Error('Firebase não configurado.');
    }
    
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
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  // ============================================
  // CADASTRO SOCIAL - Cria conta nova no database
  // ============================================
  const signUpWithGoogleVPJS = useCallback(async () => {
    if (!auth || !database) {
      throw new Error('Firebase não configurado.');
    }
    
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
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  const signUpWithFacebookVPJS = useCallback(async () => {
    if (!auth || !database) {
      throw new Error('Firebase não configurado.');
    }
    
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
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getFirebaseErrorMessage(error));
      }
      throw error;
    }
  }, []);

  const savePolygonsVPJS = useCallback(async (polygons: PolygonVPJS[]) => {
    if (!userVPJS) throw new Error('Usuário não está logado');
    if (!database) throw new Error('Firebase não configurado');
    
    console.log('🔥 Salvando polígonos:', polygons.length);
    
    const polygonsRef = ref(database, `usuarios/${userVPJS.uidVPJS}/polygonsVPJS`);
    await set(polygonsRef, polygons);
    console.log('🔥 Polígonos salvos no Firebase!');
  }, [userVPJS]);

  const saveTimerVPJS = useCallback(async (timer: TimerVPJS | null) => {
    if (!userVPJS) throw new Error('Usuário não está logado');
    if (!database) throw new Error('Firebase não configurado');
    
    console.log('🔥 Salvando timer:', timer);
    
    const timerRef = ref(database, `usuarios/${userVPJS.uidVPJS}/timerVPJS`);
    if (timer) {
      await set(timerRef, timer);
      console.log('🔥 Timer salvo no Firebase!');
    } else {
      await set(timerRef, null);
      console.log('🔥 Timer removido do Firebase!');
    }
  }, [userVPJS]);

  const value = useMemo(() => ({
    userVPJS,
    loadingVPJS,
    firebaseErrorVPJS,
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
    firebaseErrorVPJS,
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
