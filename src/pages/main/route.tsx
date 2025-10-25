import { RouteObject } from "react-router-dom";
import { HomePage } from "./feed/HomePage";
import { SuggestedUsersPage } from "./suggested/SuggestedUsersPage";
import { ProfilePage } from "./profile/ProfilePage";
import { EditProfilePage } from "./profile/EditProfilePage";
import { HashtagPage } from "./hashtag/HashtagPage";
import { SearchPage } from "./search/SearchPage";

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
    path: "/hashtag/:hashtag",
    element: <HashtagPage />
  },
  {
    path: "/search",
    element: <SearchPage />
  },
  {
    path: "/profile/:userId", 
    element: <ProfilePage />
  },
  {
    path: "/profile/:userId", 
    element: <ProfilePage />
  },
  {
    path: "/profile/edit", 
    element: <EditProfilePage />
  }
];
