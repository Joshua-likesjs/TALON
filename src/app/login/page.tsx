'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthVPJS } from '@/contexts/AuthContextVPJS';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Navigation, Clock, Hexagon } from 'lucide-react';

export default function LoginPage() {
  const [loadingVPJS, setLoadingVPJS] = useState(false);
  const [errorVPJS, setErrorVPJS] = useState('');
  const [successVPJS, setSuccessVPJS] = useState('');
  const { userVPJS, signInVPJS, signUpVPJS, resetPasswordVPJS, signInWithGoogleVPJS, signInWithFacebookVPJS } = useAuthVPJS();
  const routerVPJS = useRouter();

  useEffect(() => {
    if (userVPJS) {
      routerVPJS.push('/dashboard');
    }
  }, [userVPJS, routerVPJS]);

  const handleLoginVPJS = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingVPJS(true);
    setErrorVPJS('');

    const formDataVPJS = new FormData(e.currentTarget);
    const emailVPJS = formDataVPJS.get('email') as string;
    const passwordVPJS = formDataVPJS.get('password') as string;

    try {
      await signInVPJS(emailVPJS, passwordVPJS);
      routerVPJS.push('/dashboard');
    } catch (error: any) {
      setErrorVPJS(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoadingVPJS(false);
    }
  };

  const handleCadastroVPJS = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingVPJS(true);
    setErrorVPJS('');
    setSuccessVPJS('');

    const formDataVPJS = new FormData(e.currentTarget);
    const nomeVPJS = formDataVPJS.get('nome') as string;
    const emailVPJS = formDataVPJS.get('email') as string;
    const passwordVPJS = formDataVPJS.get('password') as string;
    const confirmPasswordVPJS = formDataVPJS.get('confirmPassword') as string;

    if (passwordVPJS !== confirmPasswordVPJS) {
      setErrorVPJS('As senhas não coincidem.');
      setLoadingVPJS(false);
      return;
    }

    if (passwordVPJS.length < 6) {
      setErrorVPJS('A senha deve ter pelo menos 6 caracteres.');
      setLoadingVPJS(false);
      return;
    }

    try {
      await signUpVPJS(nomeVPJS, emailVPJS, passwordVPJS);
      setSuccessVPJS('Cadastro realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        routerVPJS.push('/dashboard');
      }, 2000);
    } catch (error: any) {
      setErrorVPJS(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoadingVPJS(false);
    }
  };

  const handleResetPasswordVPJS = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingVPJS(true);
    setErrorVPJS('');
    setSuccessVPJS('');

    const formDataVPJS = new FormData(e.currentTarget);
    const emailVPJS = formDataVPJS.get('email') as string;

    try {
      await resetPasswordVPJS(emailVPJS);
      setSuccessVPJS('Email de redefinição enviado! Verifique sua caixa de entrada.');
      e.currentTarget.reset();
    } catch (error: any) {
      setErrorVPJS(error.message || 'Erro ao enviar email de redefinição. Tente novamente.');
    } finally {
      setLoadingVPJS(false);
    }
  };

  const handleGoogleLoginVPJS = async () => {
    setLoadingVPJS(true);
    setErrorVPJS('');
    try {
      await signInWithGoogleVPJS();
      routerVPJS.push('/dashboard');
    } catch (error: any) {
      setErrorVPJS('Erro ao entrar com Google. Tente novamente.');
    } finally {
      setLoadingVPJS(false);
    }
  };

  const handleFacebookLoginVPJS = async () => {
    setLoadingVPJS(true);
    setErrorVPJS('');
    try {
      await signInWithFacebookVPJS();
      routerVPJS.push('/dashboard');
    } catch (error: any) {
      setErrorVPJS('Erro ao entrar com Facebook. Tente novamente.');
    } finally {
      setLoadingVPJS(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">

        {/* Left side - Branding */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GeoFence App VPJS</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sistema inteligente de geofencing com criação de áreas personalizadas e monitoramento em tempo real
            </p>
          </div>

          <div className="space-y-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recursos do Sistema:</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-500" />
                <span>Rastreamento de localização em tempo real</span>
              </div>
              <div className="flex items-center gap-2">
                <Hexagon className="w-4 h-4 text-green-500" />
                <span>Criação de áreas personalizadas no mapa</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Temporizador com verificação automática</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>Verificação de posição dentro/fora da área</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre ou cadastre-se para acessar o GeoFence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
                <TabsTrigger value="reset">Recuperar Senha</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLoginVPJS} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="seu@email.com" required disabled={loadingVPJS} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" name="password" type="password" placeholder="••••••••" required disabled={loadingVPJS} />
                  </div>

                  {errorVPJS && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorVPJS}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loadingVPJS}>
                    {loadingVPJS ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</> : 'Entrar'}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      ou entre com
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" type="button" onClick={handleGoogleLoginVPJS} disabled={loadingVPJS}>
                    <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                  <Button variant="outline" type="button" onClick={handleFacebookLoginVPJS} disabled={loadingVPJS} className="bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </Button>
                </div>
              </TabsContent>

              {/* Cadastro Tab */}
              <TabsContent value="cadastro">
                <form onSubmit={handleCadastroVPJS} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input id="nome" name="nome" type="text" placeholder="Seu nome" required disabled={loadingVPJS} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-cadastro">Email</Label>
                    <Input id="email-cadastro" name="email" type="email" placeholder="seu@email.com" required disabled={loadingVPJS} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-cadastro">Senha</Label>
                    <Input id="password-cadastro" name="password" type="password" placeholder="Mínimo 6 caracteres" required disabled={loadingVPJS} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" required disabled={loadingVPJS} />
                  </div>

                  {errorVPJS && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorVPJS}</AlertDescription>
                    </Alert>
                  )}
                  {successVPJS && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      <AlertDescription>{successVPJS}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loadingVPJS}>
                    {loadingVPJS ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cadastrando...</> : 'Cadastrar'}
                  </Button>
                </form>
              </TabsContent>

              {/* Reset Password Tab */}
              <TabsContent value="reset">
                <form onSubmit={handleResetPasswordVPJS} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-reset">Email para Recuperação</Label>
                    <Input id="email-reset" name="email" type="email" placeholder="seu@email.com" required disabled={loadingVPJS} />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Enviaremos um link para você redefinir sua senha.
                  </p>

                  {errorVPJS && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorVPJS}</AlertDescription>
                    </Alert>
                  )}
                  {successVPJS && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      <AlertDescription>{successVPJS}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loadingVPJS}>
                    {loadingVPJS ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : 'Enviar Link de Recuperação'}
                  </Button>
                </form>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
