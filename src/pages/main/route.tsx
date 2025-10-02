import { RouteObject } from "react-router-dom";
import { HomePage } from "./feed/HomePage";

export const feedRoutes: RouteObject[] = [
  {
    path: "/home",
    element: <HomePage />
  }
];
