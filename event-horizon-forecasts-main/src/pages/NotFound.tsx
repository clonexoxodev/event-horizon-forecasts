import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("404: attempted route", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="grid min-h-[70vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-[#4F46E5]/8">
            <AlertTriangle className="h-10 w-10 text-[#4F46E5]" />
          </div>

          <h1 className="text-[80px] font-extrabold leading-none text-[#111827] sm:text-[100px]">404</h1>

          <p className="mt-3 text-xl font-bold text-[#111827]">Page not found</p>
          <p className="mt-2 text-sm text-[#6B7280]">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#4F46E5] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default NotFound;
