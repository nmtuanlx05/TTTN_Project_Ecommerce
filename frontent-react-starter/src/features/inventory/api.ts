import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  AdjustStockInput,
  ExportStockInput,
  ImportStockInput,
  InventoryItem,
  InventoryListParams,
  InventorySummary,
  InventorySummaryParams,
  MovementListParams,
  StockChangeResult,
  StockMovement,
} from "./types"

/** Gọi API kho (docs/api/inventory.md). Chỉ `queries.ts` được import file này. */

export function listInventory(
  params: InventoryListParams,
  signal?: AbortSignal,
): Promise<Paginated<InventoryItem>> {
  return apiGetPage<InventoryItem>("/admin/inventory", { params, signal })
}

export function getInventorySummary(
  params: InventorySummaryParams,
  signal?: AbortSignal,
): Promise<InventorySummary> {
  return apiGet<InventorySummary>("/admin/inventory/summary", { params, signal })
}

export function importStock(variantId: number, input: ImportStockInput): Promise<StockChangeResult> {
  return apiSend<StockChangeResult>("post", `/admin/inventory/${variantId}/import`, input)
}

export function exportStock(variantId: number, input: ExportStockInput): Promise<StockChangeResult> {
  return apiSend<StockChangeResult>("post", `/admin/inventory/${variantId}/export`, input)
}

export function adjustStock(variantId: number, input: AdjustStockInput): Promise<StockChangeResult> {
  return apiSend<StockChangeResult>("post", `/admin/inventory/${variantId}/adjust`, input)
}

export function updateMinStock(variantId: number, minStock: number): Promise<InventoryItem> {
  return apiSend<InventoryItem>("patch", `/admin/inventory/${variantId}/min-stock`, { minStock })
}

export function listMovements(
  variantId: number,
  params: MovementListParams,
  signal?: AbortSignal,
): Promise<Paginated<StockMovement>> {
  return apiGetPage<StockMovement>(`/admin/inventory/${variantId}/movements`, { params, signal })
}
