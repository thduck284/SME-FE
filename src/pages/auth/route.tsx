import { RouteObject } from "react-router-dom";
import { LoginPage } from "./login/LoginPage";
import { RegisterPage } from "./register/RegisterPage"; 
import { ForgotPasswordPage } from "./forget-password/ForgotPasswordPage";

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />
  },
];
