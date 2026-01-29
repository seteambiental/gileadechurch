import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPhone, formatCep, formatCPF, formatCNPJ, formatRG } from "@/lib/masks";

export type MaskType = "phone" | "cep" | "cpf" | "cnpj" | "rg";

interface MaskedInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  mask: MaskType;
  value?: string;
  onChange?: (value: string) => void;
}

const maskFunctions: Record<MaskType, (value: string) => string> = {
  phone: formatPhone,
  cep: formatCep,
  cpf: formatCPF,
  cnpj: formatCNPJ,
  rg: formatRG,
};

const maxLengths: Record<MaskType, number> = {
  phone: 15,
  cep: 9,
  cpf: 14,
  cnpj: 18,
  rg: 12,
};

const placeholders: Record<MaskType, string> = {
  phone: "(00) 00000-0000",
  cep: "00000-000",
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  rg: "00.000.000-0",
};

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, value = "", onChange, placeholder, maxLength, ...props }, ref) => {
    const formatFn = maskFunctions[mask];
    const defaultMaxLength = maxLengths[mask];
    const defaultPlaceholder = placeholders[mask];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatFn(e.target.value);
      onChange?.(formatted);
    };

    return (
      <input
        type="text"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? defaultPlaceholder}
        maxLength={maxLength ?? defaultMaxLength}
        inputMode={mask === "phone" || mask === "cep" || mask === "cpf" || mask === "cnpj" ? "numeric" : "text"}
        {...props}
      />
    );
  },
);
MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
