import { useRoutes } from "react-router-dom";
import { authRoutes } from "@/pages/auth/route"; 
import { feedRoutes } from "@/pages/main/route"; 

function App() {
  const element = useRoutes([...authRoutes, ...feedRoutes]); 
  return element;
}

export default App;
