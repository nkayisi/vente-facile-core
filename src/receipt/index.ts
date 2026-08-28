/**
 * Fabrique de tickets, partie portable.
 *
 * Un document se DÉCRIT ici, sous forme de blocs typés ; il se REND ailleurs.
 * Trois moteurs consomment ces mêmes blocs :
 *   - `frontend/lib/receipt/render-pdf.ts`  : PDF jsPDF, pour le navigateur ;
 *   - mobile `src/printing/render-text.ts`  : texte 42 colonnes, imprimante NYX ;
 *   - mobile `src/printing/render-html.ts`  : HTML puis PDF, repli iOS.
 *
 * C'est ce qui met fin à la double implémentation : web et mobile décrivent
 * littéralement le même document, ils n'en diffèrent que par le rendu.
 */

export type { Block, ItemRow, KvRow, AmountRow } from "./blocks";
export { compact } from "./blocks";

export type { PaperWidth, FontRole, FontSpec, SpaceSize, RuleWeight, Tokens } from "./tokens";
export { tokensFor, FONTS, leading, leadingOf } from "./tokens";

export {
  decimalsOf,
  symbolOf,
  formatAmount,
  formatMoney,
  formatBare,
  formatPoints,
  formatQuantity,
  deaccent,
  type CurrencyOverride,
  type CurrencyOverrides,
} from "./money";

export {
  orgHeaderBlocks,
  footerBlocks,
  type OrgIdentity,
  type LoadedLogo,
  type ReceiptChrome,
} from "./identity";

export {
  DOCUMENT_IDENTITIES,
  DUPLICATE_CHIP,
  type DocumentKind,
  type DocumentIdentity,
} from "./documents/types";

export type { BaseDocumentData, DebtData, LoyaltyData } from "./documents/common";

export {
  buildSaleReceipt,
  type SaleReceiptData,
  type SaleReceiptItem,
  type SaleReceiptPayment,
} from "./documents/sale";

export {
  buildPaymentReceipt,
  type PaymentReceiptData,
} from "./documents/payment";

export {
  buildCashSessionReceipt,
  buildExpenseReceipt,
  type CashSessionReceiptData,
  type CashSessionCurrencyLine,
  type ExpenseReceiptData,
} from "./documents/cash-session";
