import { SignupForm } from "../../components/signup-form"

export default function CadastroPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-white p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
