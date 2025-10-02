import AuthLayout from "@/modules/auth/components/layout/AuthLayout";
import SigninForm from "@/modules/auth/pages/SigninForm";
import SignupForm from "@/modules/auth/pages/SignupForm";

export const authRoutes = [
  {
    element: <AuthLayout />,
    children: [
      { path: "/sign-in", element: <SigninForm /> },
      { path: "/sign-up", element: <SignupForm /> },
    ],
  },
];
