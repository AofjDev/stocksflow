import { cn } from '@/lib/utils';

interface FloorPlanProps {
  onSelectArea?: (areaId: string) => void;
}

/**
 * Structural floor plan matching the warehouse layout.
 * Each zone is a clickable region. Colors/fills will be configured later.
 */
const WarehouseFloorPlan = ({ onSelectArea }: FloorPlanProps) => {
  const handleClick = (areaId: string) => {
    onSelectArea?.(areaId);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 overflow-auto">
      <div
        className="relative mx-auto"
        style={{ width: 900, height: 680 }}
      >
        {/* ─── OUTER WALLS ─── */}
        <div className="absolute inset-0 border-2 border-foreground/60 rounded-sm" />

        {/* ─── DOCK DOORS (top edge) ─── */}
        <div className="absolute top-0 left-[160px] right-[340px] flex justify-between px-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-1.5 h-5 bg-foreground/40 rounded-b" />
          ))}
        </div>

        {/* ─── ÁREA DE CARREGAMENTO ─── */}
        <div
          onClick={() => handleClick('carregamento')}
          className="absolute cursor-pointer hover:bg-accent/20 transition-colors rounded border border-dashed border-foreground/20"
          style={{ top: 8, left: 140, width: 420, height: 100 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground text-center mt-6">
            Área de carregamento
          </p>
        </div>

        {/* ─── PERFIS / DISCOS / FITAS ACABAMENTO (top-left) ─── */}
        <div
          onClick={() => handleClick('perfis_acabamento')}
          className="absolute cursor-pointer hover:bg-accent/20 transition-colors rounded border border-foreground/30 bg-muted/30"
          style={{ top: 30, left: 12, width: 110, height: 80 }}
        >
          <p className="text-[9px] text-muted-foreground text-center mt-2 px-1 leading-tight">
            Perfis, Discos/Fitas de acabamento
          </p>
        </div>

        {/* ─── SALA LOGÍSTICA (right side) ─── */}
        <div
          onClick={() => handleClick('sala_logistica')}
          className="absolute cursor-pointer hover:bg-accent/20 transition-colors rounded border border-foreground/30 bg-muted/30"
          style={{ top: 60, left: 600, width: 80, height: 55 }}
        >
          <p className="text-[9px] text-muted-foreground text-center mt-3 px-1 leading-tight">
            Sala Logística
          </p>
        </div>

        {/* ─── LEFT STORAGE RACKS (Rua 1-3 area, upper-left) ─── */}
        <Zone
          id="rua_1_2"
          onClick={handleClick}
          top={120} left={12} width={120} height={80}
          label="Rua 1-2"
          className="bg-blue-500/10 border-blue-500/30"
        />

        {/* ─── LEFT STORAGE RACKS (lower-left, brown area) ─── */}
        <Zone
          id="rua_3_4"
          onClick={handleClick}
          top={210} left={12} width={120} height={55}
          label="Rua 3-4"
          className="bg-amber-700/10 border-amber-700/30"
        />

        {/* ─── LEFT BOTTOM RACKS (green block, lower-left) ─── */}
        <Zone
          id="rua_5_6"
          onClick={handleClick}
          top={275} left={12} width={120} height={70}
          label="Rua 5-6"
          className="bg-emerald-500/10 border-emerald-500/30"
        />

        {/* ─── CENTER-LEFT LARGE BLOCK (green area) ─── */}
        <Zone
          id="bloco_verde"
          onClick={handleClick}
          top={170} left={150} width={200} height={140}
          label="Bloco Central (Verde)"
          className="bg-emerald-500/10 border-emerald-500/30"
        />

        {/* ─── CENTER LARGE BLOCK (blue area) ─── */}
        <Zone
          id="bloco_azul"
          onClick={handleClick}
          top={170} left={360} width={130} height={140}
          label="Bloco Central (Azul)"
          className="bg-blue-500/10 border-blue-500/30"
        />

        {/* ─── RIGHT BLOCK - RED ─── */}
        <Zone
          id="bloco_vermelho"
          onClick={handleClick}
          top={150} left={520} width={100} height={60}
          label="Bloco Vermelho"
          className="bg-red-500/10 border-red-500/30"
        />

        {/* ─── RIGHT BLOCK - ORANGE ─── */}
        <Zone
          id="bloco_laranja"
          onClick={handleClick}
          top={150} left={630} width={80} height={60}
          label="Bloco Laranja"
          className="bg-orange-500/10 border-orange-500/30"
        />

        {/* ─── RIGHT BLOCK - BLACK/DARK ─── */}
        <Zone
          id="bloco_escuro"
          onClick={handleClick}
          top={150} left={720} width={80} height={60}
          label="Bloco Escuro"
          className="bg-foreground/5 border-foreground/30"
        />

        {/* ─── RIGHT AREA - BLUE ROWS (mid-right) ─── */}
        <Zone
          id="ruas_direita_azul"
          onClick={handleClick}
          top={220} left={520} width={280} height={90}
          label="Ruas Direita (Azul)"
          className="bg-blue-500/10 border-blue-500/30"
        />

        {/* ─── RIGHT AREA - LOWER BOXES ─── */}
        <Zone
          id="ruas_direita_inferior"
          onClick={handleClick}
          top={320} left={580} width={220} height={80}
          label="Área Direita Inferior"
          className="bg-muted/50 border-foreground/20"
        />

        {/* ─── CENTER BOTTOM - small blocks ─── */}
        <Zone
          id="bloco_centro_inferior"
          onClick={handleClick}
          top={330} left={370} width={60} height={60}
          label=""
          className="bg-muted/40 border-foreground/20"
        />

        {/* ─── INDUSTRIAL (bottom-left, dashed) ─── */}
        <div
          onClick={() => handleClick('industrial')}
          className="absolute cursor-pointer hover:bg-accent/20 transition-colors rounded"
          style={{
            top: 370, left: 12, width: 340, height: 170,
            border: '2px dashed hsl(var(--foreground) / 0.3)',
          }}
        >
          <p className="text-xs font-semibold text-muted-foreground absolute bottom-4 left-4">
            Industrial
          </p>
        </div>

        {/* ─── RACKS MPs (bottom-right) ─── */}
        <div
          onClick={() => handleClick('racks_mps')}
          className="absolute cursor-pointer hover:bg-accent/20 transition-colors rounded border border-foreground/30"
          style={{ top: 490, left: 480, width: 320, height: 130 }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground ml-3 mt-2">
            Racks MPs
          </p>

          {/* SC25 label */}
          <div
            className="absolute border border-dashed border-foreground/20 rounded"
            style={{ top: 20, left: 10, width: 260, height: 40 }}
          >
            <span className="text-[9px] text-muted-foreground absolute -top-2.5 right-2 bg-card px-1">SC25</span>
          </div>

          {/* SC26 label */}
          <div
            className="absolute border border-dashed border-foreground/20 rounded"
            style={{ top: 20, left: 240, width: 70, height: 40 }}
          >
            <span className="text-[9px] text-muted-foreground absolute -top-2.5 right-1 bg-card px-1">SC26</span>
          </div>

          {/* Rack grid representation */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 h-8 rounded-sm border border-foreground/15 bg-muted/30" />
            ))}
          </div>
        </div>

        {/* ─── GRID LINES for center storage (visual pattern) ─── */}
        <StorageGrid top={175} left={155} cols={10} rows={7} cellW={18} cellH={18} color="emerald" />
        <StorageGrid top={175} left={365} cols={7} rows={7} cellW={16} cellH={18} color="blue" />
        <StorageGrid top={155} left={525} cols={5} rows={3} cellW={18} cellH={16} color="red" />
        <StorageGrid top={155} left={635} cols={4} rows={3} cellW={18} cellH={16} color="orange" />
        <StorageGrid top={155} left={725} cols={4} rows={3} cellW={18} cellH={16} color="slate" />
        <StorageGrid top={225} left={525} cols={14} rows={4} cellW={18} cellH={18} color="blue" />
      </div>
    </div>
  );
};

/* ─── Reusable zone block ─── */
const Zone = ({
  id, onClick, top, left, width, height, label, className,
}: {
  id: string; onClick: (id: string) => void;
  top: number; left: number; width: number; height: number;
  label: string; className?: string;
}) => (
  <div
    onClick={() => onClick(id)}
    className={cn(
      "absolute cursor-pointer hover:brightness-110 transition-all rounded border",
      className,
    )}
    style={{ top, left, width, height }}
  >
    {label && (
      <p className="text-[9px] font-medium text-muted-foreground text-center mt-1 px-1 leading-tight">
        {label}
      </p>
    )}
  </div>
);

/* ─── Visual storage grid pattern (decorative cells) ─── */
const StorageGrid = ({
  top, left, cols, rows, cellW, cellH, color,
}: {
  top: number; left: number; cols: number; rows: number;
  cellW: number; cellH: number; color: string;
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/20',
    blue: 'border-blue-500/20',
    red: 'border-red-500/20',
    orange: 'border-orange-500/20',
    slate: 'border-foreground/10',
  };

  return (
    <div
      className="absolute pointer-events-none grid"
      style={{
        top, left,
        gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellH}px)`,
      }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className={cn("border", colorMap[color] || 'border-foreground/10')} />
      ))}
    </div>
  );
};

export default WarehouseFloorPlan;
