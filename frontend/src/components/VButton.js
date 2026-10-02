import { forwardRef } from "react";

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variants = {
  primary:
    "bg-[#2A4038] text-[#FDFBF7] hover:bg-[#1E2F28] hover:-translate-y-0.5 shadow-sm hover:shadow-md",
  accent:
    "bg-[#C86D51] text-white hover:bg-[#B0593B] hover:-translate-y-0.5 shadow-sm hover:shadow-md",
  outline:
    "border border-[#2A4038] text-[#2A4038] hover:bg-[#2A4038] hover:text-[#FDFBF7]",
  light:
    "bg-white/95 text-[#1C1E1D] hover:bg-white hover:-translate-y-0.5 shadow-sm",
  ghost: "text-[#2A4038] hover:bg-[#EFECE6]",
};

const sizes = {
  sm: "text-sm px-4 py-2 rounded-full",
  md: "text-sm px-6 py-3 rounded-full",
  lg: "text-base px-8 py-4 rounded-full",
};

const VButton = forwardRef(
  ({ variant = "primary", size = "md", className = "", as: Comp = "button", ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
VButton.displayName = "VButton";
export default VButton;
