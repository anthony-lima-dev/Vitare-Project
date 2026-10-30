
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@vitare/ui-components";
import { Download, X, Smartphone, Globe, CheckCircle, Info } from "lucide-react";
import { cn } from "@vitare/ui-components";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptProps {
  appName?: string;
  className?: string;
}

export function InstallPrompt({ appName = "Vitare Equipe", className }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const dismissedRef = useRef(false);
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check if already installed - compute during render, not in effect
  const isStandalone = typeof window !== "undefined" && 
    (window.matchMedia("(display-mode: standalone)").matches || 
     (navigator as Navigator & { standalone?: boolean }).standalone === true);

  // Use a ref to track if we've already initialized the installed state
  const initializedRef = useRef(false);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Check if already installed - run once on mount using ref to avoid setState in effect
  useEffect(() => {
    if (isStandalone && !initializedRef.current) {
      initializedRef.current = true;
      setIsInstalled(true);
      setIsInstallable(false);
    }
  }, [isStandalone]); // Only run when isStandalone changes

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt === null) {
      // No programmatic prompt available - show platform-specific instructions
      if (isIOS) {
        setShowIOSInstructions(true);
      } else {
        setShowAndroidInstructions(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      } else {
        dismissedRef.current = true;
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Erro ao exibir prompt de instalação:", error);
    }
  }, [deferredPrompt, isIOS]);

  // Don't show if already installed, dismissed, or not installable
  // Use a derived state instead of accessing ref during render
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    setIsDismissed(dismissedRef.current);
  }, []);

  if (isInstalled || !isInstallable || isDismissed) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6", className)}>
      {/* Main install button */}
      <div className="animate-slide-up">
        <Button
          onClick={handleInstallClick}
          variant="default"
          size="lg"
          className={cn(
            "gap-2 shadow-lg",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "border border-primary/20"
          )}
          aria-label={`Instalar ${appName}`}
        >
          <Download className="size-4" aria-hidden="true" />
          <span>Instalar {appName}</span>
        </Button>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Smartphone className="size-5 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Instalar no iOS</h3>
            </div>
            <p className="text-gray-600 mb-4">
              No Safari, toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima)
              e selecione <strong>"Adicionar à Tela de Início"</strong>.
            </p>
            <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Globe className="size-4 text-gray-400" aria-hidden="true" />
                <span>1. Toque no botão Compartilhar <ShareIcon /> na barra inferior</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Info className="size-4 text-gray-400" aria-hidden="true" />
                <span>2. Role para baixo e toque em "Adicionar à Tela de Início"</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="size-4 text-green-500" aria-hidden="true" />
                <span>3. Confirme tocando em "Adicionar"</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowIOSInstructions(false)}
              >
                Entendi
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowIOSInstructions(false)}
                aria-label="Fechar instruções"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Android/Other Instructions Modal */}
      {showAndroidInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                <Smartphone className="size-5 text-green-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Como instalar</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Toque no menu do navegador (geralmente ⋮ ou ☰)
              e procure por "Instalar aplicativo" ou "Adicionar à tela inicial".
            </p>
            <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" aria-hidden="true" />
                <span>Chrome/Edge: Menu → "Instalar {appName}"</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" aria-hidden="true" />
                <span>Firefox: Menu → "Instalar"</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-500" aria-hidden="true" />
                <span>Samsung Internet: Menu → "Adicionar à tela inicial"</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAndroidInstructions(false)}
              >
                Entendi
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAndroidInstructions(false)}
                aria-label="Fechar instruções"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}

// Simple Share icon for iOS instructions
function ShareIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="6.68" />
    </svg>
  );
}
