import { RouteObject } from "react-router-dom";
import { HomePage } from "./feed/HomePage";
import { SuggestedUsersPage } from "./suggested/SuggestedUsersPage";
import { ProfilePage } from "./profile/ProfilePage";
import { ProfileOtherPage } from "./profile/ProfileOtherPage";
import { EditProfilePage } from "./profile/EditProfilePage";

export const feedRoutes: RouteObject[] = [
  {
    path: "/home",
    element: <HomePage />
  },
  {
    path: "/suggested",
    element: <SuggestedUsersPage />
  },
  {
    path: "/profile/:userId", 
    element: <ProfilePage />
  },
  {
    path: "/profile-other/:userId", 
    element: <ProfileOtherPage />
  },
  {
    path: "/profile/edit", 
    element: <EditProfilePage />
  }
];
