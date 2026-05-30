import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-8 transition-[left] duration-200 ease-linear",
        "left-0 md:left-64 md:peer-data-[state=collapsed]:left-16"
      )}
    >
      <SidebarTrigger className="-ml-1 text-foreground bg-gray-100 rounded-full size-8" />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
    </header>
  );
}
