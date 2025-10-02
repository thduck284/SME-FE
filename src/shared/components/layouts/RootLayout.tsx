import { Outlet } from "react-router-dom";

import Topbar from "@/shared/components/layouts/Topbar";
import Bottombar from "@/shared/components/layouts/Bottombar";
import LeftSidebar from "@/shared/components/layouts/LeftSidebar";

const RootLayout = () => {
  return (
    <div className="w-full md:flex">
      <Topbar />
      <LeftSidebar />

      <section className="flex flex-1 h-full">
        <Outlet />
      </section>

      <Bottombar />
    </div>
  );
};

export default RootLayout;
