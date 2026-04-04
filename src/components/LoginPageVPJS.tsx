'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthVPJS } from '@/contexts/AuthContextVPJS';

export function LoginPageVPJS() {
  const {
    firebaseErrorVPJS,
    signInVPJS,
    signUpVPJS,
    resetPasswordVPJS,
    signInWithGoogleVPJS,
    signInWithFacebookVPJS,
    signUpWithGoogleVPJS,
    signUpWithFacebookVPJS,
  } = useAuthVPJS();

  // Estados para Login
  const [loginEmailVPJS, setLoginEmailVPJS] = useState('');
  const [loginPasswordVPJS, setLoginPasswordVPJS] = useState('');

  // Estados para Cadastro
  const [signupNameVPJS, setSignupNameVPJS] = useState('');
  const [signupEmailVPJS, setSignupEmailVPJS] = useState('');
  const [signupPasswordVPJS, setSignupPasswordVPJS] = useState('');

  // Estados para Recuperação de Senha
  const [resetEmailVPJS, setResetEmailVPJS] = useState('');

  // Estados de UI
  const [loadingVPJS, setLoadingVPJS] = useState(false);
  const [errorVPJS, setErrorVPJS] = useState<string | null>(null);
  const [successVPJS, setSuccessVPJS] = useState<string | null>(null);

  // Handler para Login
  const handleLoginVPJS = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingVPJS(true);
    setErrorVPJS(null);

    try {
      await signInVPJS(loginEmailVPJS, loginPasswordVPJS);
    } catch (error: any) {
      setErrorVPJS(error.message || 'Erro ao fazer login');
    } finally {
      setLoadingVPJS(false);
    }
  };

  // Handler para Cadastro
  const handleSignupVPJS = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingVPJS(true);
    setErrorVPJS(null);

    try {
      await signUpVPJS(signupNameVPJS, signupEmailVPJS, signupPasswordVPJS);
      setSuccessVPJS('Cadastro realizado com sucesso!');
    } catch (error: any) {
      setErrorVPJS(error.message || 'Erro ao criar conta');
    } finally {
      setLoadingVPJS(false);
    }
  };

  // Handler para Recuperação de Senha
  const handleResetPasswordVPJS = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingVPJS(true);
    setErrorVPJS(null);

    try {
      await resetPasswordVPJS(resetEmailVPJS);
      setSuccessVPJS('Email de recuperação enviado com sucesso!');
    } catch (error: any) {
      setErrorVPJS(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setLoadingVPJS(false);
    }
  };

  // Handler para Login Social (só funciona se já tiver conta)
  const handleSocialLoginVPJS = async (provider: 'google' | 'facebook') => {
    setLoadingVPJS(true);
    setErrorVPJS(null);

    try {
      if (provider === 'google') {
        await signInWithGoogleVPJS();
      } else {
        await signInWithFacebookVPJS();
      }
    } catch (error: any) {
      setErrorVPJS(error.message || `Erro ao fazer login com ${provider}`);
    } finally {
      setLoadingVPJS(false);
    }
  };

  // Handler para Cadastro Social (cria nova conta)
  const handleSocialSignupVPJS = async (provider: 'google' | 'facebook') => {
    setLoadingVPJS(true);
    setErrorVPJS(null);

    try {
      if (provider === 'google') {
        await signUpWithGoogleVPJS();
      } else {
        await signUpWithFacebookVPJS();
      }
    } catch (error: any) {
      setErrorVPJS(error.message || `Erro ao criar conta com ${provider}`);
    } finally {
      setLoadingVPJS(false);
    }
  };

  const clearMessages = () => {
    setErrorVPJS(null);
    setSuccessVPJS(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" x2="9" y1="3" y2="18" />
                <line x1="15" x2="15" y1="6" y2="21" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">GeoFence App</CardTitle>
          <CardDescription>
            Faça login ou crie uma conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Erro de configuração do Firebase */}
          {firebaseErrorVPJS && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                <strong>Erro de configuração:</strong> {firebaseErrorVPJS}
                <br />
                <span className="text-sm mt-2 block">
                  Adicione as variáveis de ambiente NEXT_PUBLIC_FIREBASE_* no Vercel.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {errorVPJS && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorVPJS}</AlertDescription>
            </Alert>
          )}
          {successVPJS && (
            <Alert className="mb-4 border-green-500 text-green-500">
              <AlertDescription>{successVPJS}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full" onValueChange={clearMessages}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              <TabsTrigger value="recuperar">Recuperar</TabsTrigger>
            </TabsList>

            {/* Tab de Login */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={handleLoginVPJS} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmailVPJS}
                    onChange={(e) => setLoginEmailVPJS(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPasswordVPJS}
                    onChange={(e) => setLoginPasswordVPJS(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loadingVPJS}>
                  {loadingVPJS ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  type="button"
                  disabled={loadingVPJS}
                  onClick={() => handleSocialLoginVPJS('google')}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={loadingVPJS}
                  onClick={() => handleSocialLoginVPJS('facebook')}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    />
                  </svg>
                  Facebook
                </Button>
              </div>
            </TabsContent>

            {/* Tab de Cadastro */}
            <TabsContent value="cadastro" className="space-y-4 mt-4">
              <form onSubmit={handleSignupVPJS} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={signupNameVPJS}
                    onChange={(e) => setSignupNameVPJS(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmailVPJS}
                    onChange={(e) => setSignupEmailVPJS(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPasswordVPJS}
                    onChange={(e) => setSignupPasswordVPJS(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loadingVPJS}>
                  {loadingVPJS ? 'Criando...' : 'Criar conta'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou cadastre-se com
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  type="button"
                  disabled={loadingVPJS}
                  onClick={() => handleSocialSignupVPJS('google')}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={loadingVPJS}
                  onClick={() => handleSocialSignupVPJS('facebook')}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    />
                  </svg>
                  Facebook
                </Button>
              </div>
            </TabsContent>

            {/* Tab de Recuperação de Senha */}
            <TabsContent value="recuperar" className="space-y-4 mt-4">
              <form onSubmit={handleResetPasswordVPJS} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={resetEmailVPJS}
                    onChange={(e) => setResetEmailVPJS(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loadingVPJS}>
                  {loadingVPJS ? 'Enviando...' : 'Enviar email de recuperação'}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center">
                Enviaremos um link para você redefinir sua senha.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            GeoFence App © {new Date().getFullYear()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
