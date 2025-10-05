import { RouteObject } from "react-router-dom";
import { HomePage } from "./feed/HomePage";
import { ProfilePage } from "./profile/ProfilePage"; 

export const feedRoutes: RouteObject[] = [
  {
    path: "/home",
    element: <HomePage />
  },
  {
    path: "/profile", 
    element: <ProfilePage />
  }
];
