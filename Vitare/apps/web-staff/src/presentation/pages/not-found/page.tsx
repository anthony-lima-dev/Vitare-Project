import { Link } from "react-router-dom";

export default function StaffNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-red-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-gray-500">A rota de monitoramento informada não existe.</p>
        <Link className="mt-6 inline-flex font-medium text-red-600 underline" to="/">Voltar ao monitoramento</Link>
      </div>
    </div>
  );
}
