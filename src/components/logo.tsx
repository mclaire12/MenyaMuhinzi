import logo from "@/assets/logo.png";

export function Logo({ className = "size-8" }: { className?: string }) {
  return <img src={logo} alt="" className={className} />;
}
