import { CompleteRegisterForm } from "../../components/complete-register-form";

export default function CompleteRegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 p-6 md:p-10">
      <div className="w-full max-w-lg">
        <CompleteRegisterForm />
      </div>
    </div>
  );
}
