import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle"
          title="Toggle theme (Light, Dark, Evtaar, System)"
          className="text-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20"
        >
          <Sun className="theme-icon-sun h-[1.2rem] w-[1.2rem] transition-all" />
          <Moon className="theme-icon-moon absolute h-[1.2rem] w-[1.2rem] transition-all" />
          <Palette className="theme-icon-evtaar absolute h-[1.2rem] w-[1.2rem] transition-all" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-popover-border text-popover-foreground">
        <DropdownMenuItem 
          onClick={() => setTheme("light")} 
          className="text-popover-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary cursor-pointer"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")} 
          className="text-popover-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary cursor-pointer"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("evtaar")} 
          className="text-popover-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary font-medium cursor-pointer"
        >
          <Palette className="mr-2 h-4 w-4" />
          <span>Evtaar Theme</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")} 
          className="text-popover-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary cursor-pointer"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
