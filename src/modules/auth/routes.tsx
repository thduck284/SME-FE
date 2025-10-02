import AuthLayout from "./AuthLayout";
import SigninForm from "./forms/SigninForm";
import SignupForm from "./forms/SignupForm";

export const authRoutes = [
  {
    element: <AuthLayout />,
    children: [
      { path: "/sign-in", element: <SigninForm /> },
      { path: "/sign-up", element: <SignupForm /> },
    ],
  },
];
