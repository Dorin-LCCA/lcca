import useReveal from "../hooks/useReveal";

// Section heading with optional overline, centered or left aligned.
export default function SectionHeading({ overline, title, subtitle, align = "left", light = false }) {
  const [ref, inView] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "in-view" : ""} max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {overline && <p className={`overline mb-3 ${light ? "text-[#D4A359]" : "text-[#2A4038]"}`}>{overline}</p>}
      <h2 className={`font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-balance ${light ? "text-white" : "text-[#1C1E1D]"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-lg font-light leading-relaxed ${light ? "text-white/75" : "text-[#4A4E4B]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
