/**
 * 静态数据加载（方案调整后）：数据为构建期生成的静态 JSON（frontend/public/data/），
 * 前端直接 fetch，按模块级 Promise 缓存，多次挂载/切换筛选只请求一次。
 */

const cache = new Map<string, Promise<unknown>>()

export function fetchJson<T>(url: string): Promise<T> {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    p.catch(() => cache.delete(url)) // 失败后允许重试
    cache.set(url, p)
  }
  return p as Promise<T>
}
