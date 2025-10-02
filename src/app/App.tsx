import { useRoutes } from "react-router-dom";
import { Toaster } from "@/shared/components/ui/toaster";
import { authRoutes } from "@/modules/auth/routes/router";

import "./globals.css";

const App = () => {
  const routes = useRoutes([...authRoutes /* , ...feedRoutes */]);

  return (
    <main className="flex h-screen">
      {routes}
      <Toaster />
    </main>
  );
};

export default App;
