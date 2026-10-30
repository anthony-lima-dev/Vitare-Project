import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-[#52AF7A]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-gray-500">A página solicitada não existe no Vitare.</p>
        <Link className="mt-6 inline-flex font-medium text-[#52AF7A] underline" to="/">Voltar ao início</Link>
      </div>
    </div>
  );
}
