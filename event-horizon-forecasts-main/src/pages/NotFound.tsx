import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-[#F3F4F6]">
          <AlertTriangle className="h-10 w-10 text-[#D1D5DB]" />
        </div>

        <h1 className="text-[80px] font-black leading-none text-[#111827] sm:text-[100px]">404</h1>

        <p className="mt-3 text-xl font-bold text-[#111827]">Page not found</p>
        <p className="mt-2 text-sm text-[#6B7280]">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#4F46E5] px-6 text-sm font-bold text-white transition hover:bg-[#4338CA]"
        >
          <Home className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
