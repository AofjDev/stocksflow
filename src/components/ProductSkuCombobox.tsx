import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
}

interface ProductSkuComboboxProps {
  products: Product[];
  value: string; // product_id
  onChange: (productId: string) => void;
  placeholder?: string;
}

const ProductSkuCombobox = ({ products, value, onChange, placeholder = 'Digite o SKU ou nome...' }: ProductSkuComboboxProps) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = products.find(p => p.id === value);

  useEffect(() => {
    if (selected && !open) {
      setSearch('');
    }
  }, [selected, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.length > 0
    ? products.filter(p => {
        const s = search.toLowerCase();
        return p.sku.toLowerCase().includes(s) || p.name.toLowerCase().includes(s);
      }).slice(0, 50)
    : [];

  const handleSelect = (product: Product) => {
    onChange(product.id);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 h-10 rounded-md border border-input bg-background px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground">{selected.sku}</span>
          <span className="text-sm truncate flex-1">{selected.name}</span>
          <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      )}

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <ScrollArea className="max-h-60">
            <div className="p-1">
              {filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left rounded-sm text-sm",
                    "hover:bg-accent hover:text-accent-foreground transition-colors"
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{p.sku}</span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {open && search.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md p-4 text-center text-sm text-muted-foreground">
          Nenhum material encontrado
        </div>
      )}
    </div>
  );
};

export default ProductSkuCombobox;
