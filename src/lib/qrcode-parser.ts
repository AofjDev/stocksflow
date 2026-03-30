/**
 * QR Code parser for inventory materials.
 * 
 * Formats:
 * - Q000XXYYYYY  (Q + 000 + quantity(2 digits) + SKU(5 digits))
 * - Q00XXYYYYY   (Q + 00 + quantity(2 digits) + SKU(5 digits))
 * - Q000XXYYYYYY (Q + 000 + quantity(2 digits) + SKU(6+ digits))
 * - Q00XXYYYYYY  (Q + 00 + quantity(2 digits) + SKU(6+ digits))
 * 
 * Also handles longer prefixes like Q0007, Q00036, etc.
 * The code structure is: Q + zeros + quantity digits + material code
 */

// Known material codes from the catalog for reference matching
const KNOWN_CODES = [
  '313665', '133846', '162975', '133559', '312152', '315003', '310191',
  '310190', '140365', '92939', '92943', '92946', '92950', '92954',
  '92964', '92967', '92970', '140464', '140359', '92983', '92993',
  '92999', '93003', '93008', '93018', '93022', '93025', '93031',
  '93035', '140463', '140371', '281635', '140358', '168668', '307172',
  '304391', '304393', '4088092', '4087197', '296922', '4043834',
  '4043835', '4093639', '4066966', '4084165', '4084164', '154146',
  '142687', '142685', '4066969', '4066970', '4089902', '303538',
  '4043837', '4087796', '4094219', '4094217', '142087', '94477',
  '92981', '157442', '93037', '4066968', '303537', '166553',
  '304941', '4043836', '4044121', '162978', '162976', '162979',
  '162980', '162977',
];

export interface QRCodeResult {
  raw: string;
  quantity: number;
  materialCode: string;
  sku: string | null;
  valid: boolean;
}

export function parseQRCode(code: string): QRCodeResult {
  const result: QRCodeResult = { raw: code, quantity: 0, materialCode: '', sku: null, valid: false };
  
  if (!code || !code.startsWith('Q')) return result;

  // Remove the leading Q
  const rest = code.slice(1);
  
  // Try to match against known codes
  for (const knownCode of KNOWN_CODES) {
    if (rest.endsWith(knownCode)) {
      const prefix = rest.slice(0, rest.length - knownCode.length);
      // prefix contains zeros + quantity digits
      // Extract quantity: remove leading zeros, take remaining as quantity
      const qtyStr = prefix.replace(/^0+/, '');
      const qty = parseInt(qtyStr, 10);
      if (!isNaN(qty) && qty > 0) {
        result.quantity = qty;
        result.materialCode = knownCode;
        result.valid = true;
        return result;
      }
    }
  }

  // Fallback heuristic: strip Q, then zeros, then 2-digit quantity, then material code
  // Pattern: Q + (00 or 000 or 0000...) + qty(2-3 digits) + materialCode(5+ digits)
  const match = rest.match(/^(0{2,4})(\d{2,3})(\d{5,})$/);
  if (match) {
    result.quantity = parseInt(match[2], 10);
    result.materialCode = match[3];
    result.valid = true;
  }

  return result;
}
