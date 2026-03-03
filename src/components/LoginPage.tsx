"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
            <svg
              className="w-10 h-10 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FitDashboard</h1>
          <p className="text-blue-300 text-sm">
            Seu painel pessoal de saúde e bem-estar
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Conecte sua conta Google Fit para visualizar suas estatísticas de
            saúde, gráficos e tendências personalizadas.
          </p>

          {/* Features list */}
          <ul className="space-y-3 mb-8">
            {[
              { icon: "👟", text: "Passos e distância diária" },
              { icon: "❤️", text: "Frequência cardíaca e tendências" },
              { icon: "🔥", text: "Calorias queimadas" },
              { icon: "😴", text: "Qualidade do sono" },
              { icon: "⚖️", text: "Histórico de peso" },
              { icon: "🏃", text: "Minutos de atividade" },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-base">{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>

          {/* Sign in button */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-semibold py-3 px-6 rounded-xl hover:bg-slate-100 transition-colors duration-200 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Entrar com Google
          </button>

          {/* Download button */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-center text-xs text-slate-400 mb-3">
              Quer rodar o projeto localmente?
            </p>
            <a
              href="/kkfit-deployment.zip"
              download="kkfit-deployment.zip"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Baixar Código Fonte (54 KB)
            </a>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            Seus dados são lidos diretamente do Google Fit e nunca armazenados.
          </p>
        </div>
      </div>
    </main>
  );
}
