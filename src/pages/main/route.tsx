import { RouteObject } from "react-router-dom";
import { HomePage } from "./feed/HomePage";
import { SuggestedUsersPage } from "./suggested/SuggestedUsersPage";

export const feedRoutes: RouteObject[] = [
  {
    path: "/home",
    element: <HomePage />
  },
  {
    path: "/suggested",
    element: <SuggestedUsersPage />
  }
];
