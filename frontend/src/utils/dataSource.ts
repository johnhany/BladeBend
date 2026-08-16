/**
 * 数据真伪标记约定：
 * - `source_url` 以 `mock://` 开头（如 `mock://seed`）→ 开发用模拟数据（已全部清除）
 * - 真实数据：`source_url` 为来源 URL 或 null（未提供链接，如部分省份 md 无 URL）
 */
export function isMockSource(sourceUrl?: string | null): boolean {
  return !!sourceUrl && sourceUrl.startsWith('mock://')
}
