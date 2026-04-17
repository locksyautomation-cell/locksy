interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-white p-6 shadow-sm ${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
