import { 
  Smartphone, 
  Cpu, 
  Camera, 
  BatteryCharging, 
  Calendar, 
  Layers, 
  Tag, 
  Percent, 
  Gauge 
} from "lucide-react";
import type { Phone } from "@/src/types/phone";

interface DetailedSpecsProps {
  phone: Phone;
  formatPrice: (price: number) => string;
}

export function DetailedSpecs({ phone, formatPrice }: DetailedSpecsProps) {
  // Extract specs details
  const specItems = [
    { label: "Brand", value: phone.brand, icon: Tag },
    { label: "Model Name", value: phone.model, icon: Smartphone },
    { label: "Launch Year", value: phone.launch_year ? String(phone.launch_year) : "N/A", icon: Calendar },
    { label: "Processor / Chipset", value: phone.processor || phone.chipset || "N/A", icon: Cpu },
    { label: "RAM capacity", value: phone.ram || "N/A", icon: Layers },
    { label: "Storage Capacity", value: phone.storage || "N/A", icon: Layers },
    { label: "Display Specifications", value: phone.display || "N/A", icon: Smartphone },
    { label: "Battery Details", value: phone.battery || "N/A", icon: BatteryCharging },
    { label: "Rear Camera Systems", value: phone.camera || "N/A", icon: Camera },
    { label: "Operating System (OS)", value: phone.os || "N/A", icon: Gauge },
    { label: "Base Price in India", value: formatPrice(phone.price), icon: Percent },
  ];

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-8 backdrop-blur-md shadow-2xl">
      <div className="border-b border-zinc-850 pb-5 mb-6">
        <h2 className="text-xl font-bold text-white tracking-wide">Technical Specifications</h2>
        <p className="text-xs text-zinc-500 mt-1">Detailed hardware audit and component overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {specItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={index}
              className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition duration-300"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-zinc-900 shrink-0 text-zinc-400">
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-550 block tracking-wider">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-zinc-200 leading-normal block">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
