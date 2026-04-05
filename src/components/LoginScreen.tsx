"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginScreenProps {
  onLogin: (user: { email: string; name: string }) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
    setError("");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Mock login - in production, this would call an API
    const userName = email.split("@")[0];
    onLogin({ email, name: userName });
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Preencha todos os campos");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    // Simulate registration delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Mock registration - in production, this would call an API
    onLogin({ email, name });
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    
    // Simulate OAuth delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Mock Google login
    onLogin({ email: "usuario@gmail.com", name: "Usuário Google" });
    setIsLoading(false);
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    setError("");
    
    // Simulate OAuth delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Mock Facebook login
    onLogin({ email: "usuario@facebook.com", name: "Usuário Facebook" });
    setIsLoading(false);
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    resetForm();
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="flex-1 bg-linear-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center p-8 lg:p-16">
        <div className="max-w-md text-center lg:text-left">
          {/* Logo */}
          <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto lg:mx-0 mb-6 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" x2="9" y1="3" y2="18" />
              <line x1="15" x2="15" y1="6" y2="21" />
            </svg>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            GeoFence App
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Crie áreas de geofencing de forma simples e acompanhe sua localização em tempo real.
          </p>

          {/* Features */}
          <div className="space-y-4 hidden lg:block">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <span>Rastreamento de localização</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                </svg>
              </div>
              <span>Criação de áreas personalizadas</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span>Verificação automática</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login/Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
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
            <h1 className="text-2xl font-bold">GeoFence App</h1>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            {isRegister ? "Criar conta" : "Bem-vindo!"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isRegister 
              ? "Preencha os dados para se cadastrar" 
              : "Entre com sua conta para continuar"}
          </p>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 flex items-center justify-center gap-3"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{isRegister ? "Cadastrar com Google" : "Entrar com Google"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2] hover:border-[#166FE5]"
              onClick={handleFacebookLogin}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>{isRegister ? "Cadastrar com Facebook" : "Entrar com Facebook"}</span>
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou {isRegister ? "cadastre-se" : "continue"} com email
              </span>
            </div>
          </div>

          {/* Email Login/Register Form */}
          <form onSubmit={isRegister ? handleRegister : handleEmailLogin} className="space-y-4">
            {/* Name field - only for register */}
            {isRegister && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                disabled={isLoading}
              />
            </div>

            {/* Confirm password - only for register */}
            {isRegister && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar senha
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isRegister ? "Criando conta..." : "Entrando..."}</span>
                </div>
              ) : (
                isRegister ? "Criar conta" : "Entrar"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister ? (
              <>
                Já tem uma conta?{" "}
                <button 
                  onClick={toggleMode}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </button>
              </>
            ) : (
              <>
                Não tem uma conta?{" "}
                <button 
                  onClick={toggleMode}
                  className="text-primary hover:underline font-medium"
                >
                  Cadastre-se
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">
              {isRegister ? "Criando conta..." : "Entrando..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
