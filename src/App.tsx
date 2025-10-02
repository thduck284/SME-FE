import { useRoutes } from "react-router-dom";
import { authRoutes } from "@/pages/auth/route"; 

function App() {
  const element = useRoutes(authRoutes); 
  return element;
}

export default App;