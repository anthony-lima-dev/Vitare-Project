import { Link } from "react-router-dom";
import { VitareLogo } from "../components/vitare-logo";
import { Button } from "@vitare/ui-components";
import {
  Shield,
  Bell,
Users,
  Smartphone,
  Clock,
  CheckCircle,
  ArrowRight,
  Heart
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <VitareLogo className="h-9 w-9 object-contain" />
              <span className="text-xl font-bold text-gray-900">Vitare</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-[#52AF7A]"
                >
                  Entrar
                </Button>
              </Link>
              <Link to="/cadastro">
                <Button className="bg-[#52AF7A] hover:bg-[#449966] text-white">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#52AF7A]/10 text-[#52AF7A] text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Sua saúde, protegida e acessível
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight text-balance">
              Gerencie sua saúde de forma
              <span className="text-[#52AF7A]"> inteligente</span> e
              <span className="text-[#52AF7A]"> segura</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed text-pretty max-w-2xl mx-auto">
              O Vitare é seu companheiro digital de saúde. Mantenha suas
              informações médicas organizadas, acessíveis em emergências e
              compartilhe com profissionais de saúde com total segurança.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/cadastro">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#52AF7A] hover:bg-[#449966] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-[#52AF7A]/25 transition-all hover:shadow-xl hover:shadow-[#52AF7A]/30"
                >
                  Criar Conta
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl"
                >
                  Entrar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Tudo que você precisa para cuidar da sua saúde
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Funcionalidades pensadas para facilitar o seu dia a dia e garantir
              atendimento rápido em situações de emergência.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#52AF7A]/10 rounded-xl flex items-center justify-center mb-6">
                <Heart className="h-6 w-6 text-[#52AF7A]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Perfil Médico Completo
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Mantenha todas as suas informações de saúde em um só lugar:
                doenças crônicas, alergias, tipo sanguíneo e muito mais.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#52AF7A]/10 rounded-xl flex items-center justify-center mb-6">
                <Bell className="h-6 w-6 text-[#52AF7A]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Alertas de Emergência
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Em situações críticas, envie alertas instantâneos para contatos
                de emergência e unidades de saúde próximas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#52AF7A]/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-[#52AF7A]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Contatos de Emergência
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Cadastre familiares e responsáveis para serem notificados
                automaticamente em caso de emergência médica.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#52AF7A]/10 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="h-6 w-6 text-[#52AF7A]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Acesso Offline
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Aplicativo PWA que funciona mesmo sem internet. Suas informações
                críticas sempre acessíveis quando você precisar.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#52AF7A]/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-[#52AF7A]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Dados Seguros
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Suas informações médicas são criptografadas e protegidas
                seguindo os mais altos padrões de segurança.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#52AF7A]/10 rounded-xl flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-[#52AF7A]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Histórico Médico
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Acompanhe todo o seu histórico de saúde, consultas e
                medicamentos em uma linha do tempo organizada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Por que escolher o Vitare?
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Desenvolvido com foco na experiência do usuário e nas
                necessidades reais de pacientes e profissionais de saúde.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-[#52AF7A] shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    Interface intuitiva e fácil de usar em qualquer idade
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-[#52AF7A] shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    Integração direta com unidades de saúde parceiras
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-[#52AF7A] shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    Compartilhamento seguro de informações com médicos
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-[#52AF7A] shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    Suporte 24/7 para emergências médicas
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-[#52AF7A] shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    Gratuito para uso pessoal
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-linear-to-br from-[#52AF7A]/5 to-[#52AF7A]/10 rounded-3xl p-8 lg:p-12 border border-gray-100">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-[#52AF7A]/10 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-[#52AF7A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Maria Silva</p>
                    <p className="text-sm text-gray-500">Tipo Sanguíneo: O+</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-sm mb-1">Alergias</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-amber-50 text-amber-800 border-amber-200 rounded-full text-sm">
                        Amendoim
                      </span>
                      <span className="px-3 py-1 bg-amber-50 text-amber-800 border-amber-200 rounded-full text-sm">
                        Picada de Insetos
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="mb-1">Medicamentos</p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-2 border border-gray-200">
                      <p className="text-sm text-gray-700 mb-1">
                        Medicamentos - Permitidos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-[#52AF7A]/10 text-[#52AF7A] rounded-full text-sm">
                          Dipirona
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 mb-2 border border-gray-200">
                      <p className="text-sm text-gray-700 mb-1">
                        Medicamentos - Não Permitidos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                          Penicilina
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-sm mb-1">Condições</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-[#52AF7A]/10 text-[#52AF7A] rounded-full text-sm">
                        Diabetes Tipo 2
                      </span>
                      <span className="px-3 py-1 bg-[#52AF7A]/10 text-[#52AF7A] rounded-full text-sm">
                        Hipertensão
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#52AF7A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Comece a cuidar da sua saúde hoje
          </h2>
          <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já confiam no Vitare para
            gerenciar suas informações de saúde.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-[#52AF7A] hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Criar Conta Gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-[#52AF7A] border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <VitareLogo className="h-9 w-9 object-contain" />
              <span className="text-xl font-bold text-white">Vitare</span>
            </div>
            <p className="text-gray-400 text-sm">
              2026 Vitare. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="#"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Privacidade
              </Link>
              <Link
                to="#"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Termos
              </Link>
              <Link
                to="#"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Contato
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
