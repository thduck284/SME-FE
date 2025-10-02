import { RouteObject } from "react-router-dom";
import { LoginPage } from "./login/LoginPage";
import { RegisterPage } from "./register/RegisterPage"; 

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
];
