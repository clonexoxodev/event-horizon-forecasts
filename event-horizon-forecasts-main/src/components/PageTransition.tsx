import { ReactNode } from "react";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  return (
    <div className="animate-fade-up">
      {children}
    </div>
  );
};
